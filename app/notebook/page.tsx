'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NotebookCover } from '@/components/notebook-cover'
import { NotebookInterior } from '@/components/notebook-interior'
import { LogOut } from 'lucide-react'
import {
  DEFAULT_NOTEBOOK_STYLE,
  hydrateNotebookStylePrefs,
  type NotebookStylePrefs,
  resolveNotebookColors,
} from '@/lib/notebook-style'
import { notebookStyleToRow, rowToNotebookStyle } from '@/lib/notebook-settings-db'

const SETTINGS_COLUMNS_BASE =
  'user_id,font,icons,theme,accent_color,paper_color,ink_color,line_color,cover_image_url'
const SETTINGS_COLUMNS_WITH_COVER_LIST = `${SETTINGS_COLUMNS_BASE},cover_image_urls`
const NOTEBOOK_STYLE_CACHE_KEY_PREFIX = 'zai:notebook-style'
const LEGACY_NOTEBOOK_STYLE_CACHE_KEY = 'zai:notebook-style'
const LAST_USER_ID_CACHE_KEY = 'zai:last-user-id'
const DEFAULT_LOADING_COVER_SRC = '/images/notebook-cover.jpg'
const COVER_OPEN_TRANSITION_MS = 1550

function getNotebookStyleCacheKey(userId: string) {
  return `${NOTEBOOK_STYLE_CACHE_KEY_PREFIX}:${userId}`
}

function buildCoverImageSrc(url: string) {
  const raw = url.trim()
  if (!raw) return DEFAULT_LOADING_COVER_SRC
  if (raw.startsWith('data:image/')) return raw
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw

  const normalized = raw.replace(/^\/+/, '')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '')

  if (/^[a-z0-9.-]+\.supabase\.co\/storage\//i.test(normalized)) {
    return `https://${normalized}`
  }

  if (normalized.startsWith('storage/v1/object/public/')) {
    return supabaseUrl ? `${supabaseUrl}/${normalized}` : `/${normalized}`
  }

  if (normalized.startsWith('object/public/')) {
    return supabaseUrl ? `${supabaseUrl}/storage/v1/${normalized}` : `/storage/v1/${normalized}`
  }

  if (normalized.startsWith('photos/') || normalized.startsWith('videos/')) {
    return supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/${normalized}`
      : raw
  }

  // Legacy fallback: when only object path is stored, assume `photos` bucket.
  return supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/photos/${normalized}`
    : raw
}

function readCachedNotebookStyle(userId: string): NotebookStylePrefs | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(getNotebookStyleCacheKey(userId))
    if (!raw) return null
    return hydrateNotebookStylePrefs(JSON.parse(raw))
  } catch {
    return null
  }
}

function readLastUserId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(LAST_USER_ID_CACHE_KEY)
    if (!value) return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  } catch {
    return null
  }
}

function writeLastUserId(userId: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LAST_USER_ID_CACHE_KEY, userId)
  } catch {
    // Ignore storage quota/access errors.
  }
}

function readLegacyCachedNotebookStyle(): NotebookStylePrefs | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LEGACY_NOTEBOOK_STYLE_CACHE_KEY)
    if (!raw) return null
    return hydrateNotebookStylePrefs(JSON.parse(raw))
  } catch {
    return null
  }
}

function clearLegacyCachedNotebookStyle() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(LEGACY_NOTEBOOK_STYLE_CACHE_KEY)
  } catch {
    // Ignore storage access errors.
  }
}

function readAnyCachedNotebookStyle(): NotebookStylePrefs | null {
  if (typeof window === 'undefined') return null
  const legacy = readLegacyCachedNotebookStyle()
  if (legacy) return legacy

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key || !key.startsWith(`${NOTEBOOK_STYLE_CACHE_KEY_PREFIX}:`)) continue
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      return hydrateNotebookStylePrefs(JSON.parse(raw))
    }
  } catch {
    return null
  }

  return null
}

function writeCachedNotebookStyle(userId: string, style: NotebookStylePrefs) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(getNotebookStyleCacheKey(userId), JSON.stringify(style))
  } catch {
    // Ignore storage quota/access errors.
  }
}

function isMissingCoverImageUrlsColumn(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: string; message?: string; details?: string }
  const composed = `${candidate.message ?? ''} ${candidate.details ?? ''}`.toLowerCase()
  return (
    candidate.code === '42703' ||
    candidate.code === 'PGRST204' ||
    composed.includes('cover_image_urls')
  )
}

function getActiveCoverImageUrlFromDbRow(row: unknown): string | null {
  if (!row || typeof row !== 'object') return null
  const value = (row as { cover_image_url?: unknown }).cover_image_url
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export default function NotebookPage() {
  const [user, setUser] = useState<any>(null)
  const [notebookStyle, setNotebookStyle] = useState<NotebookStylePrefs>(DEFAULT_NOTEBOOK_STYLE)
  const [dbCoverImageUrl, setDbCoverImageUrl] = useState<string | null>(null)
  const [coverResolved, setCoverResolved] = useState(false)
  const [canPersistStyle, setCanPersistStyle] = useState(true)
  const [supportsCoverListColumn, setSupportsCoverListColumn] = useState(true)
  // Opening animation states:
  // 'cover' (show book, tap to open) → 'opening' (animation) → 'open' (interior)
  const [bookState, setBookState] = useState<'cover' | 'opening' | 'open'>('cover')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openStageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const notebookColors = resolveNotebookColors(notebookStyle)
  const activeCoverUrl = notebookStyle.coverImageUrl ?? dbCoverImageUrl
  const coverImageSrc = activeCoverUrl ? buildCoverImageSrc(activeCoverUrl) : null
  const themedVars = {
    ['--nb-accent' as string]: notebookColors.accent,
    ['--nb-paper' as string]: notebookColors.paper,
    ['--nb-ink' as string]: notebookColors.ink,
    ['--nb-line' as string]: notebookColors.line,
    ['--nb-muted' as string]: notebookColors.muted,
    ['--nb-border' as string]: notebookColors.border,
    ['--nb-on-accent' as string]: notebookColors.onAccent,
    ['--nb-accent-soft' as string]: notebookColors.accentSoft,
    ['--nb-gold' as string]: notebookColors.gold,
    ['--nb-gold-dark' as string]: notebookColors.goldDark,
    ['--nb-margin-line' as string]: notebookColors.marginLine,
    ['--nb-wood-overlay' as string]: notebookColors.woodOverlay,
  } as CSSProperties

  useLayoutEffect(() => {
    const lastUserId = readLastUserId()
    const cachedStyle = lastUserId ? readCachedNotebookStyle(lastUserId) : readAnyCachedNotebookStyle()
    if (cachedStyle) {
      setNotebookStyle(cachedStyle)
      setDbCoverImageUrl(cachedStyle.coverImageUrl ?? null)
      setCoverResolved(true)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const hydrateStyleFromSessionCache = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (cancelled) return
        const sessionUserId = session?.user?.id
        if (!sessionUserId) return

        writeLastUserId(sessionUserId)
        const cachedStyle = readCachedNotebookStyle(sessionUserId) ?? readLegacyCachedNotebookStyle()
        if (cachedStyle) {
          setNotebookStyle(cachedStyle)
          setDbCoverImageUrl(cachedStyle.coverImageUrl ?? null)
          setCoverResolved(true)
        }
      } catch {
        // Ignore cache hydration errors and continue with defaults.
      }
    }

    hydrateStyleFromSessionCache()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          router.push('/auth/login')
          return
        }

        writeLastUserId(user.id)
        const userScopedCachedStyle = readCachedNotebookStyle(user.id)
        const legacyCachedStyle = userScopedCachedStyle ? null : readLegacyCachedNotebookStyle()
        const cachedStyle = userScopedCachedStyle ?? legacyCachedStyle
        if (cachedStyle) {
          setNotebookStyle(cachedStyle)
          writeCachedNotebookStyle(user.id, cachedStyle)
          if (legacyCachedStyle) {
            clearLegacyCachedNotebookStyle()
          }
        }

        let queryResult = await supabase
          .from('user_notebook_settings')
          .select(SETTINGS_COLUMNS_WITH_COVER_LIST)
          .eq('user_id', user.id)
          .maybeSingle()

        if (queryResult.error && isMissingCoverImageUrlsColumn(queryResult.error)) {
          setSupportsCoverListColumn(false)
          queryResult = await supabase
            .from('user_notebook_settings')
            .select(SETTINGS_COLUMNS_BASE)
            .eq('user_id', user.id)
            .maybeSingle()
        }

        const settingsData = queryResult.data
        const settingsError = queryResult.error

        if (!cancelled && settingsData) {
          const nextStyle = rowToNotebookStyle(settingsData)
          const dbActiveCoverImageUrl = getActiveCoverImageUrlFromDbRow(settingsData)
          setDbCoverImageUrl(dbActiveCoverImageUrl)
          setNotebookStyle(nextStyle)
          writeCachedNotebookStyle(user.id, nextStyle)
        } else if (!cancelled) {
          setDbCoverImageUrl(null)
        }
        if (!cancelled) {
          setCoverResolved(true)
        }

        if (settingsError && settingsError.code !== 'PGRST116') {
          console.warn('No se pudo cargar la configuración de libreta desde BD:', settingsError)
          if (settingsError.code === 'PGRST205') {
            setCanPersistStyle(false)
          }
        }

        if (cancelled) return
        setUser(user)
      } catch {
        setCoverResolved(true)
        router.push('/auth/login')
      }
    }
    getUser()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      if (openStageTimeoutRef.current) {
        clearTimeout(openStageTimeoutRef.current)
      }
    }
  }, [])

  const handleStyleChange = (nextStyle: NotebookStylePrefs) => {
    setNotebookStyle(nextStyle)
    setDbCoverImageUrl(nextStyle.coverImageUrl ?? null)
    if (user?.id) {
      writeCachedNotebookStyle(user.id, nextStyle)
    }
    if (!user?.id || !canPersistStyle) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const payload = notebookStyleToRow(user.id, nextStyle)
      const { cover_image_urls: _coverImageUrls, ...legacyPayload } = payload
      const currentPayload = supportsCoverListColumn ? payload : legacyPayload
      let { error } = await supabase
        .from('user_notebook_settings')
        .upsert(currentPayload, { onConflict: 'user_id' })

      if (error && supportsCoverListColumn && isMissingCoverImageUrlsColumn(error)) {
        setSupportsCoverListColumn(false)
        const retry = await supabase
          .from('user_notebook_settings')
          .upsert(legacyPayload, { onConflict: 'user_id' })
        error = retry.error
      }

      if (error) {
        console.error('Error guardando estilo de libreta:', error)
      } else {
        setDbCoverImageUrl(nextStyle.coverImageUrl ?? null)
        setCoverResolved(true)
      }
    }, 350)
  }

  const handleOpen = () => {
    if (bookState !== 'cover' || !user) return
    setBookState('opening')
    // After animation completes, show interior
    openStageTimeoutRef.current = setTimeout(() => setBookState('open'), COVER_OPEN_TRANSITION_MS)
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (err) {
      console.error('Error logging out:', err)
    }
  }

  // ── Interior (after open animation) ──
  if (bookState === 'open') {
    return (
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{ ...themedVars, backgroundImage: 'url(/images/wood-bg.jpg)', backgroundColor: 'var(--nb-wood-overlay, #2a1508)' }}
      >
        <div className="absolute top-3 right-3 z-50">
          <button
            onClick={handleLogout}
            className="bg-leather hover:bg-leather-dark text-parchment px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg text-sm"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
        <NotebookInterior
          userId={user.id}
          stylePrefs={notebookStyle}
          onStylePrefsChange={handleStyleChange}
        />
      </div>
    )
  }

  // ── Cover / opening animation ──
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ ...themedVars, backgroundImage: 'url(/images/wood-bg.jpg)', backgroundColor: 'var(--nb-wood-overlay, #2a1508)' }}
    >
      {/* Subtle wood grain overlay */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage: 'url(/images/wood-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-[2000ms]"
        style={{
          opacity: bookState === 'opening' ? 0.34 : 0,
          background:
            'radial-gradient(circle at center, rgba(10, 5, 2, 0.06) 0%, rgba(10, 5, 2, 0.4) 100%)',
        }}
      />
      <NotebookCover
        onOpen={handleOpen}
        isOpen={bookState === 'opening'}
        coverImageUrl={coverImageSrc}
        allowDefaultCover={coverResolved}
        interactive={Boolean(user)}
        showHint={Boolean(user)}
      />
    </div>
  )
}
