'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Save, X, Lock, Users, Music, ExternalLink, Play } from 'lucide-react'
import { LINE_H } from '@/components/notebook-interior'
import { NOTEBOOK_FONT_FAMILY_CSS_VAR } from '@/lib/notebook-style'
import { confirmDeleteToast } from '@/lib/confirm-toast'
import { hasShortMediaHost, resolveMusicEmbed } from '@/lib/media-embed'
import { resolveShortMediaUrl } from '@/lib/resolve-short-url-client'

interface Track {
  id: string
  title: string
  music_url: string
  is_shared: boolean
  created_at: string
  user_id: string
}

interface MusicPageProps {
  userId: string
}

const SERIF = { fontFamily: NOTEBOOK_FONT_FAMILY_CSS_VAR }
const PAGE_FRAME_STYLE = {
  paddingLeft: 'clamp(14px, 7vw, 52px)',
  paddingRight: 'clamp(14px, 7vw, 52px)',
}

export function MusicPage({ userId }: MusicPageProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editShared, setEditShared] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newShared, setNewShared] = useState(true)
  const [addError, setAddError] = useState('')
  const [resolvingAddUrl, setResolvingAddUrl] = useState(false)
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => { loadTracks() }, [])
  useEffect(() => {
    setActiveTrackId((previous) => {
      if (!tracks.length) return null
      if (previous && tracks.some((track) => track.id === previous)) return previous
      return tracks[0].id
    })
  }, [tracks])
  useEffect(() => {
    const activeTrack = tracks.find((track) => track.id === activeTrackId)
    if (!activeTrack) return
    if (!hasShortMediaHost(activeTrack.music_url)) return
    if (resolvedUrls[activeTrack.id]) return

    let cancelled = false
    const resolve = async () => {
      const expanded = await resolveShortMediaUrl(activeTrack.music_url)
      if (cancelled || expanded === activeTrack.music_url) return
      setResolvedUrls((prev) => ({ ...prev, [activeTrack.id]: expanded }))
    }

    resolve()
    return () => {
      cancelled = true
    }
  }, [activeTrackId, tracks, resolvedUrls])

  const loadTracks = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('music')
      .select('*')
      .or(`user_id.eq.${userId},is_shared.eq.true`)
      .order('created_at', { ascending: false })
    setTracks(data || [])
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newTitle.trim() || !newUrl.trim()) return

    setResolvingAddUrl(true)
    setAddError('')
    const expandedUrl = await resolveShortMediaUrl(newUrl)
    const parsed = resolveMusicEmbed(expandedUrl)
    setResolvingAddUrl(false)

    if (parsed.kind === 'unsupported') {
      setAddError('Usa un enlace compatible (Spotify/YouTube/SoundCloud) o un audio directo.')
      return
    }

    const { data, error } = await supabase
      .from('music')
      .insert([{ user_id: userId, title: newTitle, music_url: expandedUrl, is_shared: newShared }])
      .select()
    if (!error && data) {
      setTracks((previous) => [data[0], ...previous])
      setActiveTrackId(data[0].id)
      setIsAdding(false)
      setNewTitle(''); setNewUrl(''); setNewShared(true)
      setAddError('')
    }
  }

  const handleSaveEdit = async (id: string) => {
    const { error } = await supabase
      .from('music')
      .update({ title: editTitle, is_shared: editShared })
      .eq('id', id)
    if (!error) {
      setTracks(tracks.map(t => t.id === id ? { ...t, title: editTitle, is_shared: editShared } : t))
      setEditingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    confirmDeleteToast({
      itemLabel: 'esta canción',
      onConfirm: async () => {
        await supabase.from('music').delete().eq('id', id)
        setTracks((prev) => prev.filter((t) => t.id !== id))
        setActiveTrackId((prev) => (prev === id ? null : prev))
        setResolvedUrls((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      },
    })
  }

  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? null
  const activeTrackUrl = activeTrack ? (resolvedUrls[activeTrack.id] ?? activeTrack.music_url) : ''
  const activeTrackEmbed = activeTrack ? resolveMusicEmbed(activeTrackUrl) : null

  if (isAdding) {
    return (
      <div className="absolute inset-0 flex flex-col p-3 pt-10 sm:p-5 sm:pt-5" style={{ ...SERIF, ...PAGE_FRAME_STYLE }}>
        <div className="flex items-center justify-between" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--nb-ink, #3a2518)' }}>Nueva canción</h3>
          <button
            onClick={() => {
              setIsAdding(false)
              setAddError('')
              setResolvingAddUrl(false)
            }}
            style={{ color: 'var(--nb-accent, #8B4513)' }}
          >
            <X size={18} />
          </button>
        </div>
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Título de la canción..."
          className="w-full bg-transparent border-b-2 text-sm outline-none"
          style={{ borderColor: 'var(--nb-border, #c4a87a)', color: 'var(--nb-ink, #3a2518)', ...SERIF, height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}
          autoFocus
        />
        <input
          value={newUrl}
          onChange={e => {
            setNewUrl(e.target.value)
            setAddError('')
          }}
          placeholder="URL (Spotify, YouTube, SoundCloud, etc.)..."
          className="w-full bg-transparent border-b-2 text-sm outline-none"
          style={{ borderColor: 'var(--nb-border, #c4a87a)', color: 'var(--nb-ink, #3a2518)', ...SERIF, height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}
        />
        <p className="text-[10px]" style={{ color: 'var(--nb-muted, #8B7355)', lineHeight: `${LINE_H}px` }}>
          También soporta enlaces cortos como `spoti.fi`, `spotify.link`, `bit.ly`.
        </p>
        {addError && (
          <p className="text-[10px]" style={{ color: '#9b4040', lineHeight: `${LINE_H}px` }}>
            {addError}
          </p>
        )}
        <div className="flex-1" />
        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--nb-line, #d4c5a9)' }}>
          <button
            onClick={() => setNewShared(s => !s)}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
            style={{
              background: newShared ? 'rgba(184,134,11,0.15)' : 'rgba(139,69,19,0.1)',
              color: newShared ? 'var(--nb-gold-dark, #8B6914)' : 'var(--nb-accent, #8B4513)',
              border: `1px solid ${newShared ? 'var(--nb-gold, #B8860B)' : 'var(--nb-accent, #8B4513)'}`,
            }}
          >
            {newShared ? <Users size={12} /> : <Lock size={12} />}
            {newShared ? 'Compartida' : 'Privada'}
          </button>
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim() || !newUrl.trim() || resolvingAddUrl}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium disabled:opacity-40"
            style={{ background: 'var(--nb-accent, #8B4513)', color: '#f5ecd8' }}
          >
            <Save size={14} /> {resolvingAddUrl ? 'Procesando...' : 'Guardar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex flex-col p-3 pt-10 sm:p-5 sm:pt-5" style={PAGE_FRAME_STYLE}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--nb-ink, #3a2518)', ...SERIF }}>Nuestra Música</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded"
          style={{ background: 'var(--nb-accent, #8B4513)', color: '#f5ecd8' }}
        >
          <Plus size={12} /> Agregar
        </button>
      </div>
      
      {/* Subtitle */}
      <p className="text-[10px]" style={{ color: 'var(--nb-muted, #8B7355)', height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
        {tracks.length} {tracks.length === 1 ? 'canción' : 'canciones'}
      </p>

      <div
        className="rounded-lg border p-2 mb-2"
        style={{ borderColor: 'var(--nb-line, #d4c5a9)', background: 'rgba(245,236,216,0.45)' }}
      >
        {activeTrack ? (
          <>
            <div className="flex items-center justify-between gap-2 pb-2">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--nb-ink, #3a2518)', ...SERIF }}>
                {activeTrack.title}
              </p>
              <span
                className="text-[9px] px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: activeTrack.is_shared ? 'rgba(184,134,11,0.1)' : 'rgba(139,69,19,0.07)',
                  color: activeTrack.is_shared ? 'var(--nb-gold-dark, #8B6914)' : 'var(--nb-accent, #8B4513)',
                }}
              >
                {activeTrack.is_shared ? 'compartida' : 'privada'}
              </span>
            </div>

            {activeTrackEmbed?.kind === 'audio' && (
              <audio key={activeTrack.id} controls preload="metadata" className="w-full h-9" src={activeTrackEmbed.src} />
            )}

            {activeTrackEmbed?.kind === 'video' && (
              <video
                key={activeTrack.id}
                controls
                preload="metadata"
                className="w-full rounded bg-[#2a1508]"
                style={{ maxHeight: '220px' }}
                src={activeTrackEmbed.src}
              />
            )}

            {activeTrackEmbed?.kind === 'iframe' && (
              <iframe
                key={activeTrack.id}
                src={activeTrackEmbed.src}
                title={activeTrackEmbed.title}
                className="w-full rounded border-0 bg-black/10"
                style={{ height: `${activeTrackEmbed.height ?? 188}px` }}
                allow={activeTrackEmbed.allow}
                loading="lazy"
                allowFullScreen
              />
            )}

            {activeTrackEmbed?.kind === 'unsupported' && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px]" style={{ color: 'var(--nb-muted, #8B7355)', ...SERIF }}>
                  Esta URL no se puede reproducir dentro de la libreta.
                </p>
                <a
                  href={activeTrackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border"
                  style={{ borderColor: 'var(--nb-border, #c4a87a)', color: '#6b5744' }}
                >
                  <ExternalLink size={12} /> Abrir
                </a>
              </div>
            )}
          </>
        ) : (
          <div className="text-[11px]" style={{ color: 'var(--nb-muted, #8B7355)', ...SERIF }}>
            Selecciona una canción para reproducir.
          </div>
        )}
      </div>

      {/* Playlist */}
      <div className="notebook-scroll flex-1 min-h-0 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-xs text-center pt-8" style={{ color: 'var(--nb-muted, #8B7355)', ...SERIF }}>Cargando...</p>
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2">
            <Music size={28} style={{ color: 'var(--nb-border, #c4a87a)' }} strokeWidth={1} />
            <p className="text-xs text-center" style={{ color: 'var(--nb-muted, #8B7355)', ...SERIF }}>Sin canciones aún</p>
          </div>
        ) : (
          tracks.map((t, i) => (
            <div
              key={t.id}
              onClick={() => {
                if (editingId !== t.id) setActiveTrackId(t.id)
              }}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && editingId !== t.id) {
                  event.preventDefault()
                  setActiveTrackId(t.id)
                }
              }}
              role="button"
              tabIndex={0}
              className="flex items-center gap-3 transition-all hover:bg-amber-50/40 group cursor-pointer"
              style={{
                height: `${LINE_H * 2}px`,
                borderBottom: '1px solid rgba(180,150,100,0.15)',
                background: activeTrackId === t.id ? 'rgba(139,69,19,0.08)' : 'transparent',
              }}
            >
              {/* Number */}
              <span className="text-[10px] w-5 text-right flex-shrink-0" style={{ color: '#b8a070', ...SERIF }}>
                {i + 1}
              </span>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setActiveTrackId(t.id)
                }}
                className="h-6 w-6 rounded-full inline-flex items-center justify-center flex-shrink-0"
                style={{
                  background: activeTrackId === t.id ? 'var(--nb-accent, #8B4513)' : 'rgba(139,69,19,0.12)',
                  color: activeTrackId === t.id ? '#f5ecd8' : 'var(--nb-accent, #8B4513)',
                }}
                aria-label={`Reproducir ${t.title}`}
              >
                <Play size={11} fill="currentColor" />
              </button>

              {/* Title / edit */}
              <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ height: `${LINE_H * 2}px` }}>
                {editingId === t.id ? (
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-transparent border-b outline-none text-xs"
                    style={{ borderColor: 'var(--nb-border, #c4a87a)', color: 'var(--nb-ink, #3a2518)', ...SERIF, lineHeight: `${LINE_H}px` }}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit(t.id)}
                  />
                ) : (
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--nb-ink, #3a2518)', ...SERIF, lineHeight: `${LINE_H}px` }}>{t.title}</p>
                )}
              </div>

              {/* Privacy badge */}
              {editingId === t.id ? (
                <button
                  onClick={() => setEditShared(s => !s)}
                  className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: editShared ? 'rgba(184,134,11,0.15)' : 'rgba(139,69,19,0.1)',
                    color: editShared ? 'var(--nb-gold-dark, #8B6914)' : 'var(--nb-accent, #8B4513)',
                    border: `1px solid ${editShared ? 'var(--nb-gold, #B8860B)' : 'var(--nb-accent, #8B4513)'}`,
                  }}
                >
                  {editShared ? 'compartida' : 'privada'}
                </button>
              ) : (
                <span
                  className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: t.is_shared ? 'rgba(184,134,11,0.1)' : 'rgba(139,69,19,0.07)',
                    color: t.is_shared ? 'var(--nb-gold-dark, #8B6914)' : 'var(--nb-accent, #8B4513)',
                  }}
                >
                  {t.is_shared ? '♥' : '🔒'}
                </span>
              )}

              {/* Actions */}
              {editingId === t.id ? (
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={(event) => { event.stopPropagation(); handleSaveEdit(t.id) }} style={{ color: '#4a7c3f' }}><Save size={13} /></button>
                  <button onClick={(event) => { event.stopPropagation(); setEditingId(null) }} style={{ color: 'var(--nb-accent, #8B4513)' }}><X size={13} /></button>
                </div>
              ) : (
                <div className="flex gap-1 flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  {t.user_id === userId && (
                    <>
                      <button
                        onClick={(event) => {
                          event.stopPropagation()
                          setEditingId(t.id); setEditTitle(t.title); setEditShared(t.is_shared)
                        }}
                        style={{ color: '#6b5744' }}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button onClick={(event) => { event.stopPropagation(); handleDelete(t.id) }} style={{ color: '#9b4040' }}>
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

