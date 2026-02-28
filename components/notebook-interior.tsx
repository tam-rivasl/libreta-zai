'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  BookOpen,
  Feather,
  Image as ImageIcon,
  Lock,
  Mic,
  Music,
  Palette,
  PenTool,
  Settings,
  Type,
  Upload,
  Video,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WritingPage } from './pages/writing-page'
import { GalleryPage } from './pages/gallery-page'
import { MusicPage } from './pages/music-page'
import { VideoPage } from './pages/video-page'
import { AudioPage } from './pages/audio-page'
import { PersonalPage } from './pages/personal-page'
import {
  applyThemePreset,
  NOTEBOOK_FONTS,
  NOTEBOOK_ICONS,
  NOTEBOOK_THEMES,
  resolveNotebookColors,
  type NotebookStylePrefs,
} from '@/lib/notebook-style'

type PageType = 'index' | 'writings' | 'gallery' | 'music' | 'videos' | 'audios' | 'personal'

interface NotebookInteriorProps {
  userId: string
  stylePrefs: NotebookStylePrefs
  onStylePrefsChange: (next: NotebookStylePrefs) => void
}

const menuItems = [
  { id: 'writings' as PageType, label: 'Escritos', icon: PenTool, description: 'Notas para los dos' },
  { id: 'gallery' as PageType, label: 'Galería', icon: ImageIcon, description: 'Momentos capturados' },
  { id: 'music' as PageType, label: 'Música', icon: Music, description: 'Canciones que nos definen' },
  { id: 'videos' as PageType, label: 'Videos', icon: Video, description: 'Momentos en movimiento' },
  { id: 'audios' as PageType, label: 'Notas de Voz', icon: Mic, description: 'Mensajes de voz' },
  { id: 'personal' as PageType, label: 'Personal', icon: Lock, description: 'Solo para tus ojos' },
]

const COVER_EXPORT_WIDTH = 1200
const COVER_EXPORT_HEIGHT = 1680
const COVER_ASPECT = COVER_EXPORT_WIDTH / COVER_EXPORT_HEIGHT
const DEFAULT_COVER_OPTION = '__default_cover__'
const COVER_THUMB_CACHE_KEY_PREFIX = 'zai:notebook-cover-thumb'
const COVER_THUMB_WIDTH = 280
const COVER_THUMB_HEIGHT = 392
const SIGNED_URL_PARAM_RE = /[?&](token|signature|x-amz-signature|x-amz-credential|x-amz-date|x-amz-expires|x-amz-security-token)=/i

// Line height of the ruled paper - every component must align to this grid
export const LINE_H = 26
const NOTEBOOK_FONT_VAR = 'var(--notebook-font-family, "Times New Roman", "Times", serif)'
const NOTEBOOK_META_TEXT_COLOR =
  'color-mix(in srgb, #f4ecdd 34%, var(--nb-ink, #3a2518) 66%)'

function getCoverLabelFromUrl(url: string, index: number) {
  try {
    const pathname = new URL(url).pathname
    const fileName = pathname.split('/').pop() || ''
    const cleaned = decodeURIComponent(fileName).replace(/\.[a-z0-9]+$/i, '')
    const compact = cleaned.replace(/[-_]+/g, ' ').trim()
    return compact.length > 0 ? compact : `Portada ${index + 1}`
  } catch {
    return `Portada ${index + 1}`
  }
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const hasShort = normalized.length === 3
  const value = hasShort
    ? normalized
        .split('')
        .map((char) => `${char}${char}`)
        .join('')
    : normalized
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function buildCoverPreviewSrc(url: string) {
  if (SIGNED_URL_PARAM_RE.test(url)) return url
  return `${url}${url.includes('?') ? '&' : '?'}preview=${encodeURIComponent(url)}`
}

function getCoverThumbCacheKey(userId: string) {
  return `${COVER_THUMB_CACHE_KEY_PREFIX}:${userId}`
}

function writeCoverThumbCache(userId: string, url: string, dataUrl: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      getCoverThumbCacheKey(userId),
      JSON.stringify({ url, dataUrl }),
    )
  } catch {
    // Ignore storage quota/access errors.
  }
}

async function createCoverThumbnailDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('No se pudo crear miniatura de portada.'))
      element.src = objectUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = COVER_THUMB_WIDTH
    canvas.height = COVER_THUMB_HEIGHT
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('No se pudo acceder al canvas de miniatura.')
    }

    context.drawImage(image, 0, 0, COVER_THUMB_WIDTH, COVER_THUMB_HEIGHT)
    return canvas.toDataURL('image/jpeg', 0.72)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function createCoverThumbnailDataUrlFromUrl(url: string): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new window.Image()
    element.crossOrigin = 'anonymous'
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('No se pudo crear miniatura desde URL.'))
    element.src = url
  })

  const canvas = document.createElement('canvas')
  canvas.width = COVER_THUMB_WIDTH
  canvas.height = COVER_THUMB_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('No se pudo acceder al canvas de miniatura.')
  }

  context.drawImage(image, 0, 0, COVER_THUMB_WIDTH, COVER_THUMB_HEIGHT)
  return canvas.toDataURL('image/jpeg', 0.72)
}

async function normalizeCoverImage(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'))
      element.src = objectUrl
    })

    const sourceWidth = image.naturalWidth
    const sourceHeight = image.naturalHeight
    const sourceAspect = sourceWidth / sourceHeight

    let sx = 0
    let sy = 0
    let sw = sourceWidth
    let sh = sourceHeight

    if (sourceAspect > COVER_ASPECT) {
      sw = sourceHeight * COVER_ASPECT
      sx = (sourceWidth - sw) / 2
    } else if (sourceAspect < COVER_ASPECT) {
      sh = sourceWidth / COVER_ASPECT
      sy = (sourceHeight - sh) / 2
    }

    const canvas = document.createElement('canvas')
    canvas.width = COVER_EXPORT_WIDTH
    canvas.height = COVER_EXPORT_HEIGHT

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('No se pudo preparar la portada para subir.')
    }

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, sx, sy, sw, sh, 0, 0, COVER_EXPORT_WIDTH, COVER_EXPORT_HEIGHT)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    })

    if (!blob) {
      throw new Error('No se pudo exportar la portada.')
    }

    return new File([blob], `cover-${Date.now()}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export function NotebookInterior({
  userId,
  stylePrefs,
  onStylePrefsChange,
}: NotebookInteriorProps) {
  const [currentPage, setCurrentPage] = useState<PageType>('index')
  const [flipping, setFlipping] = useState(false)
  const [mobileShowContent, setMobileShowContent] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [stylePanelOpen, setStylePanelOpen] = useState(false)
  const coverFileRef = useRef<HTMLInputElement | null>(null)

  const selectedFont = NOTEBOOK_FONTS.find((font) => font.id === stylePrefs.font) ?? NOTEBOOK_FONTS[0]
  const selectedIcons = NOTEBOOK_ICONS.find((icon) => icon.id === stylePrefs.icons) ?? NOTEBOOK_ICONS[1]
  const selectedTheme = NOTEBOOK_THEMES.find((theme) => theme.id === stylePrefs.theme) ?? NOTEBOOK_THEMES[0]
  const colors = resolveNotebookColors(stylePrefs)
  const selectedThemeColors = resolveNotebookColors(applyThemePreset(stylePrefs, stylePrefs.theme))
  const coverImageOptions = Array.from(
    new Set([
      ...stylePrefs.coverImageUrls,
      ...(stylePrefs.coverImageUrl ? [stylePrefs.coverImageUrl] : []),
    ]),
  )
  const activeCoverValue = stylePrefs.coverImageUrl ?? DEFAULT_COVER_OPTION

  const updateStylePrefs = (next: NotebookStylePrefs) => {
    onStylePrefsChange(next)
  }

  const handleThemeChange = (theme: NotebookStylePrefs['theme']) => {
    updateStylePrefs(applyThemePreset(stylePrefs, theme))
  }

  const handleCoverFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Formato no válido',
        description: 'Selecciona una imagen JPG, PNG o WEBP para la portada.',
      })
      return
    }

    setCoverUploading(true)
    try {
      const normalizedCover = await normalizeCoverImage(file)
      const formData = new FormData()
      formData.append('file', normalizedCover, normalizedCover.name)
      formData.append('bucket', 'photos')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('No se pudo subir la portada')
      }

      const payload = await response.json()
      if (typeof payload?.url !== 'string') {
        throw new Error('URL de portada no válida')
      }

      try {
        const thumbDataUrl = await createCoverThumbnailDataUrl(normalizedCover)
        writeCoverThumbCache(userId, payload.url, thumbDataUrl)
      } catch (thumbError) {
        console.warn('No se pudo cachear miniatura local de portada:', thumbError)
      }

      const nextCoverImageUrls = [payload.url, ...coverImageOptions.filter((url) => url !== payload.url)]
      updateStylePrefs({
        ...stylePrefs,
        coverImageUrl: payload.url,
        coverImageUrls: nextCoverImageUrls,
      })
      toast({
        title: 'Portada actualizada',
        description: 'La imagen se ajustó al tamaño de la libreta y quedó seleccionada.',
      })
    } catch (error) {
      console.error('Error subiendo portada:', error)
      toast({
        variant: 'destructive',
        title: 'No se pudo actualizar la portada',
        description:
          error instanceof Error ? error.message : 'Intenta nuevamente en unos segundos.',
      })
    } finally {
      setCoverUploading(false)
    }
  }

  const navigateTo = (page: PageType) => {
    if (page === currentPage && mobileShowContent) return
    setFlipping(true)
    setTimeout(() => {
      setCurrentPage(page)
      setFlipping(false)
      setMobileShowContent(true)
    }, 300)
  }

  const goBackToMenu = () => {
    setMobileShowContent(false)
  }

  const paperBg = `
    repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent ${LINE_H - 1}px,
      ${hexToRgba(colors.line, 0.72)} ${LINE_H - 1}px,
      ${hexToRgba(colors.line, 0.72)} ${LINE_H}px
    )
  `

  const coverPreviewSrc = stylePrefs.coverImageUrl
    ? buildCoverPreviewSrc(stylePrefs.coverImageUrl)
    : '/images/notebook-cover.jpg'

  useEffect(() => {
    let cancelled = false

    const ensureCachedCoverThumb = async () => {
      if (!stylePrefs.coverImageUrl) return
      try {
        const thumbDataUrl = await createCoverThumbnailDataUrlFromUrl(coverPreviewSrc)
        if (cancelled) return
        writeCoverThumbCache(userId, stylePrefs.coverImageUrl, thumbDataUrl)
      } catch {
        // Ignore thumbnail generation failures for remote URLs.
      }
    }

    ensureCachedCoverThumb()
    return () => {
      cancelled = true
    }
  }, [coverPreviewSrc, stylePrefs.coverImageUrl, userId])

  return (
    <div
      className="notebook-shell fixed inset-0 flex items-center justify-center"
      style={
        {
          perspective: '1800px',
          ['--notebook-font-family' as string]: selectedFont.family,
          ['--notebook-icon-stroke' as string]: `${selectedIcons.strokeWidth}`,
          ['--nb-accent' as string]: colors.accent,
          ['--nb-paper' as string]: colors.paper,
          ['--nb-ink' as string]: colors.ink,
          ['--nb-line' as string]: colors.line,
          ['--nb-muted' as string]: colors.muted,
          ['--nb-border' as string]: colors.border,
          ['--nb-on-accent' as string]: colors.onAccent,
          ['--nb-accent-soft' as string]: colors.accentSoft,
          ['--nb-gold' as string]: colors.gold,
          ['--nb-gold-dark' as string]: colors.goldDark,
          ['--nb-margin-line' as string]: colors.marginLine,
          ['--nb-wood-overlay' as string]: colors.woodOverlay,
        } as CSSProperties
      }
    >
      <div
        className="notebook-frame relative flex"
        style={{
          filter: 'drop-shadow(0 18px 56px rgba(0,0,0,0.62))',
        }}
      >
        <div
          className="hidden md:block absolute top-0 bottom-0 z-20"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            width: '32px',
            background:
              'linear-gradient(to right, #1a0a04, color-mix(in srgb, var(--nb-accent, #8B4513) 40%, #2a1508), var(--nb-accent, #8B4513), color-mix(in srgb, var(--nb-accent, #8B4513) 40%, #2a1508), #1a0a04)',
            boxShadow: '0 0 20px rgba(0,0,0,0.55)',
          }}
        >
          {[10, 17, 24, 79, 86, 93].map((pct, i) => (
            <div
              key={i}
              className="absolute left-0.5 right-0.5 rounded"
              style={{
                top: `${pct}%`,
                height: '6px',
                background:
                  'linear-gradient(to bottom, #2a1008, color-mix(in srgb, var(--nb-accent, #8B4513) 72%, #2a1508), #2a1008)',
              }}
            />
          ))}
        </div>

        <div
          className={[
            'relative flex flex-col overflow-hidden',
            'w-full md:w-1/2 md:flex',
            mobileShowContent ? 'hidden' : 'flex',
          ].join(' ')}
          style={{
            backgroundColor: 'var(--nb-paper, #f5ecd8)',
            backgroundImage: paperBg,
            borderRadius: 'clamp(6px,1vw,12px) 0 0 clamp(6px,1vw,12px)',
            boxShadow: 'inset -6px 0 20px rgba(0,0,0,0.07)',
          }}
        >
          <div
            className="absolute top-0 bottom-0"
            style={{ left: '40px', width: '1px', background: 'var(--nb-margin-line, rgba(180,60,50,0.3))' }}
          />

          <div
            className="flex flex-col h-full px-4 sm:px-5"
            style={{ paddingTop: `${LINE_H}px`, paddingLeft: '52px' }}
          >
            <h2
              className="font-serif text-base sm:text-lg tracking-wide"
              style={{ color: 'var(--nb-ink, #3a2518)', fontFamily: NOTEBOOK_FONT_VAR, lineHeight: `${LINE_H}px`, height: `${LINE_H}px` }}
            >
              Nuestra Libreta
            </h2>
            <p
              className="text-[11px]"
              style={{ color: 'var(--nb-muted, #8B7355)', fontFamily: NOTEBOOK_FONT_VAR, lineHeight: `${LINE_H}px`, height: `${LINE_H}px` }}
            >
              Personaliza tu estilo único
            </p>

            <div style={{ height: `${LINE_H}px` }} />

            <div className="flex items-center gap-2 pr-2" style={{ height: `${LINE_H}px` }}>
              <button
                onClick={() => setStylePanelOpen(true)}
                className="inline-flex items-center gap-1 rounded border px-2 text-[10px] transition-colors"
                style={{
                  height: `${LINE_H - 8}px`,
                  borderColor: 'var(--nb-border, #c4a87a)',
                  background: 'color-mix(in srgb, var(--nb-accent, #8B4513) 8%, transparent)',
                  color: 'var(--nb-accent, #8B4513)',
                  fontFamily: NOTEBOOK_FONT_VAR,
                }}
              >
                <Settings size={10} />
                Personalizar
              </button>
              <span
                className="text-[10px] truncate"
                style={{ color: NOTEBOOK_META_TEXT_COLOR, fontFamily: NOTEBOOK_FONT_VAR }}
              >
                {stylePrefs.coverImageUrl ? 'Portada personalizada activa' : 'Portada clásica activa'}
              </span>
            </div>

            <div
              className="flex items-center gap-1 overflow-x-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ height: `${LINE_H}px` }}
            >
              <StyleChip label={`Fuente: ${selectedFont.label}`} />
              <StyleChip label={`Iconos: ${selectedIcons.label}`} />
              <StyleChip label={`Tema: ${selectedTheme.label}`} />
            </div>

            <div style={{ height: `${LINE_H}px` }} />

            <nav className="flex flex-col flex-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = currentPage === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
                    className="flex items-center gap-3 text-left transition-all active:opacity-70"
                    style={{
                      height: `${LINE_H * 2}px`,
                      lineHeight: `${LINE_H}px`,
                      paddingLeft: '4px',
                      background: isActive ? 'color-mix(in srgb, var(--nb-accent, #8B4513) 12%, transparent)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--nb-accent, #8B4513)' : '3px solid transparent',
                      marginLeft: '-4px',
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded flex-shrink-0"
                      style={{
                        width: '24px',
                        height: '24px',
                        background: isActive
                          ? 'var(--nb-accent, #8B4513)'
                          : 'color-mix(in srgb, var(--nb-accent, #8B4513) 8%, transparent)',
                        color: isActive ? 'var(--nb-on-accent, #f5ecd8)' : 'var(--nb-accent, #8B4513)',
                      }}
                    >
                      <Icon size={12} />
                    </div>
                    <div className="flex flex-col min-w-0 justify-center" style={{ height: `${LINE_H * 2}px` }}>
                      <span
                        className="text-sm font-medium truncate"
                        style={{ fontFamily: NOTEBOOK_FONT_VAR, color: isActive ? 'var(--nb-ink, #3a2518)' : '#6b5744', lineHeight: `${LINE_H}px` }}
                      >
                        {item.label}
                      </span>
                      <span className="text-[10px] truncate" style={{ color: '#a08c70', lineHeight: `${LINE_H * 0.8}px` }}>
                        {item.description}
                      </span>
                    </div>
                  </button>
                )
              })}
            </nav>

            <div className="flex items-center gap-2" style={{ height: `${LINE_H}px` }}>
              <div className="h-px flex-1" style={{ background: 'var(--nb-line, #d4c5a9)' }} />
              <BookOpen size={11} style={{ color: 'var(--nb-gold, #b8a070)' }} />
              <div className="h-px flex-1" style={{ background: 'var(--nb-line, #d4c5a9)' }} />
            </div>
          </div>
        </div>

        <div
          className={[
            'relative flex flex-col overflow-hidden',
            'w-full md:w-1/2 md:flex',
            mobileShowContent ? 'flex' : 'hidden',
          ].join(' ')}
          style={{
            backgroundColor: 'var(--nb-paper, #f5ecd8)',
            backgroundImage: paperBg,
            borderRadius: '0 clamp(6px,1vw,12px) clamp(6px,1vw,12px) 0',
            boxShadow: 'inset 6px 0 20px rgba(0,0,0,0.07)',
          }}
        >
          {mobileShowContent && (
            <button
              onClick={goBackToMenu}
              className="md:hidden absolute z-10 flex items-center gap-1 text-xs"
              style={{ top: '8px', left: '12px', color: 'var(--nb-accent, #8B4513)' }}
            >
              <BookOpen size={13} />
              <span style={{ fontFamily: NOTEBOOK_FONT_VAR }}>Menú</span>
            </button>
          )}

          <div
            className="absolute inset-0"
            style={{ opacity: flipping ? 0 : 1, transition: 'opacity 0.3s ease' }}
          >
            <PageContent currentPage={currentPage} userId={userId} onNavigate={navigateTo} />
          </div>
        </div>
      </div>

      <Sheet open={stylePanelOpen} onOpenChange={setStylePanelOpen}>
        <SheetContent
          side="right"
          className="p-0 border-l-0 w-[92vw] sm:max-w-md"
          style={{
            ['--nb-accent' as string]: selectedThemeColors.accent,
            ['--nb-paper' as string]: selectedThemeColors.paper,
            ['--nb-ink' as string]: selectedThemeColors.ink,
            ['--nb-line' as string]: selectedThemeColors.line,
            ['--nb-border' as string]: selectedThemeColors.border,
            ['--nb-accent-soft' as string]: selectedThemeColors.accentSoft,
            ['--nb-gold' as string]: selectedThemeColors.gold,
            ['--nb-gold-dark' as string]: selectedThemeColors.goldDark,
            ['--panel-ink' as string]:
              `color-mix(in srgb, #22150c 88%, ${selectedThemeColors.ink} 12%)`,
            ['--panel-muted' as string]:
              `color-mix(in srgb, #4a2f1d 70%, ${selectedThemeColors.ink} 30%)`,
            ['--panel-accent' as string]:
              `color-mix(in srgb, ${selectedThemeColors.accent} 80%, #2a1508)`,
            backgroundColor: selectedThemeColors.paper,
            color: 'var(--panel-ink)',
            boxShadow: '-16px 0 32px rgba(20, 8, 2, 0.38)',
          }}
        >
          <SheetHeader
            className="pb-3"
            style={{
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--nb-accent, #8B4513) 12%, transparent), transparent)',
            }}
          >
            <SheetTitle style={{ color: 'var(--panel-ink)', fontFamily: NOTEBOOK_FONT_VAR }}>
              Personalización de libreta
            </SheetTitle>
            <SheetDescription style={{ color: 'var(--panel-muted)', fontFamily: NOTEBOOK_FONT_VAR }}>
              Ajusta fuente, colores y portada sin saturar el menú principal.
            </SheetDescription>
          </SheetHeader>

          <Separator style={{ background: 'var(--nb-line, #d4c5a9)', opacity: 0.75 }} />

          <Tabs defaultValue="style" className="h-[calc(100%-112px)]">
            <TabsList
              className="mx-4 mt-4 grid w-auto grid-cols-3"
              style={{
                background: 'color-mix(in srgb, var(--nb-accent, #8B4513) 9%, var(--nb-paper, #f5ecd8))',
                border: '1px solid var(--nb-border, #c4a87a)',
              }}
            >
              <TabsTrigger
                value="style"
                className="text-[var(--panel-ink)] data-[state=active]:text-white data-[state=active]:bg-[var(--panel-accent)] data-[state=active]:border-[var(--panel-accent)]"
                style={{ fontFamily: NOTEBOOK_FONT_VAR }}
              >
                <Type size={13} />
                Estilo
              </TabsTrigger>
              <TabsTrigger
                value="colors"
                className="text-[var(--panel-ink)] data-[state=active]:text-white data-[state=active]:bg-[var(--panel-accent)] data-[state=active]:border-[var(--panel-accent)]"
                style={{ fontFamily: NOTEBOOK_FONT_VAR }}
              >
                <Palette size={13} />
                Colores
              </TabsTrigger>
              <TabsTrigger
                value="cover"
                className="text-[var(--panel-ink)] data-[state=active]:text-white data-[state=active]:bg-[var(--panel-accent)] data-[state=active]:border-[var(--panel-accent)]"
                style={{ fontFamily: NOTEBOOK_FONT_VAR }}
              >
                <ImageIcon size={13} />
                Portada
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="mt-4 h-[calc(100%-64px)] px-4 pb-6" showHorizontalScrollbar={false}>
              <TabsContent value="style" className="space-y-4 pb-6">
                <PanelCard title="Tipografía" description="Selecciona cómo se ve el texto de toda la libreta.">
                  <select
                    aria-label="Seleccionar tipografía"
                    value={stylePrefs.font}
                    onChange={(event) =>
                      updateStylePrefs({ ...stylePrefs, font: event.target.value as NotebookStylePrefs['font'] })
                    }
                    className="w-full rounded border px-3 py-2 text-sm outline-none"
                    style={{
                      borderColor: 'var(--nb-border, #c4a87a)',
                      background: 'color-mix(in srgb, var(--nb-accent, #8B4513) 6%, transparent)',
                      color: 'var(--nb-ink, #3a2518)',
                      fontFamily: NOTEBOOK_FONT_VAR,
                    }}
                  >
                    {NOTEBOOK_FONTS.map((font) => (
                      <option key={font.id} value={font.id} style={{ fontFamily: font.family }}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </PanelCard>

                <PanelCard title="Iconos" description="Define el grosor visual de los iconos.">
                  <div className="grid grid-cols-3 gap-2">
                    {NOTEBOOK_ICONS.map((iconStyle) => {
                      const isActive = iconStyle.id === stylePrefs.icons
                      return (
                        <button
                          key={iconStyle.id}
                          onClick={() => updateStylePrefs({ ...stylePrefs, icons: iconStyle.id })}
                          className="rounded border px-2 py-2 text-xs transition-colors"
                          style={{
                            fontFamily: NOTEBOOK_FONT_VAR,
                            background: isActive
                              ? 'var(--nb-accent-soft, rgba(184,134,11,0.16))'
                              : 'color-mix(in srgb, var(--nb-accent, #8B4513) 5%, transparent)',
                            color: isActive ? 'var(--nb-gold-dark, #7a5b0f)' : 'var(--panel-muted)',
                            borderColor: isActive ? 'var(--nb-gold, #B8860B)' : 'var(--nb-border, #c4a87a)',
                          }}
                        >
                          <span className="inline-flex items-center justify-center gap-1">
                            <Feather size={12} strokeWidth={iconStyle.strokeWidth} />
                            {iconStyle.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </PanelCard>

                <PanelCard title="Tema" description="Aplica una paleta base de la libreta.">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {NOTEBOOK_THEMES.map((theme) => {
                      const isActive = theme.id === stylePrefs.theme
                      const themePalette = [
                        { key: 'Acento', color: theme.accentColor },
                        { key: 'Papel', color: theme.paperColor },
                        { key: 'Tinta', color: theme.inkColor },
                        { key: 'Líneas', color: theme.lineColor },
                      ]
                      return (
                        <button
                          key={theme.id}
                          onClick={() => handleThemeChange(theme.id)}
                          className="rounded border p-2 text-left transition-colors"
                          style={{
                            borderColor: isActive ? 'var(--nb-gold, #B8860B)' : 'var(--nb-border, #c4a87a)',
                            background: isActive
                              ? 'var(--nb-accent-soft, rgba(184,134,11,0.16))'
                              : 'color-mix(in srgb, var(--nb-accent, #8B4513) 4%, transparent)',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm" style={{ fontFamily: NOTEBOOK_FONT_VAR, color: 'var(--nb-ink, #3a2518)' }}>
                              {theme.label}
                            </span>
                            <span
                              className="inline-block h-3 w-3 rounded-full"
                              style={{ background: theme.accentColor, border: '1px solid rgba(0,0,0,0.15)' }}
                            />
                          </div>
                          <p className="mt-1 text-[11px]" style={{ color: 'var(--panel-muted)', fontFamily: NOTEBOOK_FONT_VAR }}>
                            {theme.description}
                          </p>
                          <div className="mt-2 flex items-center gap-1.5">
                            {themePalette.map((tone) => (
                              <span
                                key={`${theme.id}-${tone.key}`}
                                className="inline-flex h-5 w-5 items-center justify-center rounded border"
                                title={`${tone.key}: ${tone.color}`}
                                style={{
                                  backgroundColor: tone.color,
                                  borderColor: isActive
                                    ? 'color-mix(in srgb, var(--nb-gold, #B8860B) 70%, #2a1508)'
                                    : 'rgba(0,0,0,0.2)',
                                }}
                              />
                            ))}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </PanelCard>
              </TabsContent>

              <TabsContent value="colors" className="space-y-4 pb-6">
                <PanelCard title="Ajuste fino" description="Personaliza cada color manteniendo el estilo actual.">
                  <div className="space-y-3">
                    <ThemeColorSwatch
                      label="Acento"
                      value={stylePrefs.accentColor}
                      onChange={(value) => updateStylePrefs({ ...stylePrefs, accentColor: value })}
                    />
                    <ThemeColorSwatch
                      label="Papel"
                      value={stylePrefs.paperColor}
                      onChange={(value) => updateStylePrefs({ ...stylePrefs, paperColor: value })}
                    />
                    <ThemeColorSwatch
                      label="Tinta"
                      value={stylePrefs.inkColor}
                      onChange={(value) => updateStylePrefs({ ...stylePrefs, inkColor: value })}
                    />
                    <ThemeColorSwatch
                      label="Líneas"
                      value={stylePrefs.lineColor}
                      onChange={(value) => updateStylePrefs({ ...stylePrefs, lineColor: value })}
                    />
                  </div>
                </PanelCard>

                <PanelCard title="Vista previa" description="Así se verá el papel con tus colores actuales.">
                  <div
                    className="rounded border p-3"
                    style={{
                      borderColor: 'var(--nb-border, #c4a87a)',
                      backgroundColor: stylePrefs.paperColor,
                      backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent ${LINE_H - 1}px, ${hexToRgba(stylePrefs.lineColor, 0.72)} ${LINE_H - 1}px, ${hexToRgba(stylePrefs.lineColor, 0.72)} ${LINE_H}px)`,
                    }}
                  >
                    <p style={{ color: stylePrefs.inkColor, fontFamily: selectedFont.family, lineHeight: `${LINE_H}px` }}>
                      Una línea de ejemplo para validar contraste.
                    </p>
                  </div>

                  <button
                    onClick={() => handleThemeChange(stylePrefs.theme)}
                    className="mt-3 rounded border px-3 py-2 text-xs"
                    style={{
                      borderColor: 'var(--nb-border, #c4a87a)',
                      background: 'color-mix(in srgb, var(--nb-accent, #8B4513) 7%, transparent)',
                      color: 'var(--nb-accent, #8B4513)',
                      fontFamily: NOTEBOOK_FONT_VAR,
                    }}
                  >
                    Restablecer colores del tema {selectedTheme.label}
                  </button>
                </PanelCard>
              </TabsContent>

              <TabsContent value="cover" className="space-y-4 pb-6">
                <PanelCard title="Portada" description="Se ajusta automáticamente al formato de la libreta.">
                  <div className="mx-auto w-full max-w-[230px]">
                    <div
                      className="relative overflow-hidden rounded border"
                      style={{
                        aspectRatio: '5 / 7',
                        borderColor: 'var(--nb-border, #c4a87a)',
                        background:
                          'linear-gradient(150deg, color-mix(in srgb, var(--nb-accent, #8B4513) 62%, #2a1508) 0%, #2a1508 100%)',
                      }}
                    >
                      <img
                        key={coverPreviewSrc}
                        src={coverPreviewSrc}
                        alt="Vista previa de portada"
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.src = '/images/notebook-cover.jpg'
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="mb-1.5 block text-[11px]" style={{ color: 'var(--panel-muted)', fontFamily: NOTEBOOK_FONT_VAR }}>
                      Elegir portada activa
                    </label>
                    <select
                      value={activeCoverValue}
                      onChange={(event) => {
                        const selected = event.target.value
                        updateStylePrefs({
                          ...stylePrefs,
                          coverImageUrl: selected === DEFAULT_COVER_OPTION ? null : selected,
                        })
                      }}
                      className="w-full rounded border px-3 py-2 text-xs outline-none"
                      style={{
                        borderColor: 'var(--nb-border, #c4a87a)',
                        background: 'color-mix(in srgb, var(--nb-accent, #8B4513) 6%, transparent)',
                        color: 'var(--panel-ink)',
                        fontFamily: NOTEBOOK_FONT_VAR,
                      }}
                    >
                      <option value={DEFAULT_COVER_OPTION}>Portada por defecto</option>
                      {coverImageOptions.map((url, index) => (
                        <option key={url} value={url}>
                          {getCoverLabelFromUrl(url, index)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => coverFileRef.current?.click()}
                      disabled={coverUploading}
                      className="inline-flex items-center justify-center gap-1 rounded border px-3 py-2 text-xs disabled:opacity-50"
                      style={{
                        borderColor: 'var(--nb-border, #c4a87a)',
                        background: 'color-mix(in srgb, var(--nb-accent, #8B4513) 8%, transparent)',
                        color: 'var(--nb-accent, #8B4513)',
                        fontFamily: NOTEBOOK_FONT_VAR,
                      }}
                    >
                      <Upload size={13} />
                      {coverUploading ? 'Subiendo...' : 'Cambiar portada'}
                    </button>

                    {stylePrefs.coverImageUrl && (
                      <button
                        onClick={() => {
                          updateStylePrefs({ ...stylePrefs, coverImageUrl: null })
                          toast({ title: 'Portada restaurada', description: 'Se volvió a la portada clásica.' })
                        }}
                        className="rounded border px-3 py-2 text-xs"
                        style={{
                          borderColor: 'var(--nb-border, #c4a87a)',
                          color: 'var(--panel-muted)',
                          fontFamily: NOTEBOOK_FONT_VAR,
                        }}
                      >
                        Usar portada por defecto
                      </button>
                    )}
                  </div>

                  <p className="mt-2 text-[11px]" style={{ color: 'var(--panel-muted)', fontFamily: NOTEBOOK_FONT_VAR }}>
                    Consejo: puedes subir varias imágenes y elegir una como portada desde el selector.
                  </p>

                  <input
                    ref={coverFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) {
                        void handleCoverFile(file)
                      }
                      event.currentTarget.value = ''
                    }}
                  />
                </PanelCard>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function StyleChip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center rounded border px-2 py-0.5 text-[10px] shrink-0"
      style={{
        borderColor: 'var(--nb-border, #c4a87a)',
        color: NOTEBOOK_META_TEXT_COLOR,
        background: 'color-mix(in srgb, var(--nb-accent, #8B4513) 5%, transparent)',
      }}
    >
      {label}
    </span>
  )
}

function PanelCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section
      className="rounded border p-3"
      style={{
        borderColor: 'var(--nb-border, #c4a87a)',
        background: 'color-mix(in srgb, var(--nb-accent, #8B4513) 4%, transparent)',
      }}
    >
      <h4 className="text-sm" style={{ color: 'var(--panel-ink)', fontFamily: NOTEBOOK_FONT_VAR }}>
        {title}
      </h4>
      <p className="text-[11px] mt-1 mb-3" style={{ color: 'var(--panel-muted)', fontFamily: NOTEBOOK_FONT_VAR }}>
        {description}
      </p>
      {children}
    </section>
  )
}

function ThemeColorSwatch({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (next: string) => void
}) {
  return (
    <label
      className="flex items-center justify-between gap-2 rounded border px-2 py-1.5"
      style={{
        borderColor: 'var(--nb-border, #c4a87a)',
        background: 'color-mix(in srgb, var(--nb-accent, #8B4513) 4%, transparent)',
      }}
    >
      <span className="text-xs" style={{ color: 'var(--panel-muted)', fontFamily: NOTEBOOK_FONT_VAR }}>
        {label}
      </span>
      <div className="inline-flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
          aria-label={`Seleccionar color de ${label}`}
        />
        <code
          className="text-[11px] uppercase"
          style={{ color: 'var(--panel-ink)', fontFamily: NOTEBOOK_FONT_VAR }}
        >
          {value}
        </code>
      </div>
    </label>
  )
}

function PageContent({
  currentPage,
  userId,
  onNavigate,
}: {
  currentPage: PageType
  userId: string
  onNavigate: (page: PageType) => void
}) {
  switch (currentPage) {
    case 'index':
      return <IndexPage onNavigate={onNavigate} />
    case 'writings':
      return <WritingPage userId={userId} />
    case 'gallery':
      return <GalleryPage userId={userId} />
    case 'music':
      return <MusicPage userId={userId} />
    case 'videos':
      return <VideoPage userId={userId} />
    case 'audios':
      return <AudioPage userId={userId} />
    case 'personal':
      return <PersonalPage userId={userId} />
    default:
      return <IndexPage onNavigate={onNavigate} />
  }
}

function IndexPage({ onNavigate }: { onNavigate: (page: PageType) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <BookOpen size={42} style={{ color: 'var(--nb-accent, #8B4513)', marginBottom: '16px' }} strokeWidth={1.2} />
      <h1 className="font-serif text-2xl mb-2" style={{ color: 'var(--nb-ink, #3a2518)', fontFamily: NOTEBOOK_FONT_VAR }}>
        Bienvenidos
      </h1>
      <p className="text-sm mb-8 max-w-[220px] leading-relaxed" style={{ color: '#6b5744', fontFamily: NOTEBOOK_FONT_VAR }}>
        Un rincón privado para guardar lo que nos hace especiales.
      </p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-[260px]">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center gap-2 py-3 rounded-lg transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'color-mix(in srgb, var(--nb-accent, #8B4513) 7%, transparent)',
                border: '1px solid color-mix(in srgb, var(--nb-accent, #8B4513) 18%, transparent)',
              }}
            >
              <Icon size={20} style={{ color: 'var(--nb-accent, #8B4513)' }} />
              <span className="text-[11px]" style={{ color: '#6b5744', fontFamily: NOTEBOOK_FONT_VAR }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
