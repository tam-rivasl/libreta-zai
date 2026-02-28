'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Save, X, Lock, Users, Film, ExternalLink, Play } from 'lucide-react'
import { LINE_H } from '@/components/notebook-interior'
import { FileUploadInput } from '@/components/ui/file-upload-input'
import { NOTEBOOK_FONT_FAMILY_CSS_VAR } from '@/lib/notebook-style'
import { confirmDeleteToast } from '@/lib/confirm-toast'
import { hasShortMediaHost, resolveVideoEmbed } from '@/lib/media-embed'
import { resolveShortMediaUrl } from '@/lib/resolve-short-url-client'

interface Video {
  id: string
  title: string
  video_url: string
  is_shared: boolean
  created_at: string
  user_id: string
}

interface VideoPageProps {
  userId: string
}

const SERIF = { fontFamily: NOTEBOOK_FONT_FAMILY_CSS_VAR }
const PAGE_FRAME_STYLE = {
  paddingLeft: 'clamp(14px, 7vw, 52px)',
  paddingRight: 'clamp(14px, 7vw, 52px)',
}

export function VideoPage({ userId }: VideoPageProps) {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editShared, setEditShared] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [newShared, setNewShared] = useState(true)
  const [addMode, setAddMode] = useState<'file' | 'url'>('file')
  const [addError, setAddError] = useState('')
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({})
  const [resolvingAddUrl, setResolvingAddUrl] = useState(false)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadVideos() }, [])
  useEffect(() => {
    setActiveVideoId((previous) => {
      if (!videos.length) return null
      if (previous && videos.some((video) => video.id === previous)) return previous
      return videos[0].id
    })
  }, [videos])
  useEffect(() => {
    const activeVideo = videos.find((video) => video.id === activeVideoId)
    if (!activeVideo) return
    if (!hasShortMediaHost(activeVideo.video_url)) return
    if (resolvedUrls[activeVideo.id]) return

    let cancelled = false
    const resolve = async () => {
      const expanded = await resolveShortMediaUrl(activeVideo.video_url)
      if (cancelled || expanded === activeVideo.video_url) return
      setResolvedUrls((prev) => ({ ...prev, [activeVideo.id]: expanded }))
    }

    resolve()
    return () => {
      cancelled = true
    }
  }, [activeVideoId, videos, resolvedUrls])

  const loadVideos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('videos')
      .select('*')
      .or(`user_id.eq.${userId},is_shared.eq.true`)
      .order('created_at', { ascending: false })
    setVideos(data || [])
    setLoading(false)
  }

  const handleUploadFile = async (file: File) => {
    setAddError('')
    setNewFile(file)
  }

  const handleAdd = async () => {
    if (!newTitle.trim()) return

    if (addMode === 'url') {
      if (!newUrl.trim()) return
      setResolvingAddUrl(true)
      const expandedUrl = await resolveShortMediaUrl(newUrl)
      const parsed = resolveVideoEmbed(expandedUrl)
      setResolvingAddUrl(false)
      if (parsed.kind === 'unsupported' || parsed.kind === 'audio') {
        setAddError('Usa un enlace de YouTube/Vimeo o un archivo de video directo (.mp4, .webm, etc).')
        return
      }

      const { data, error } = await supabase
        .from('videos')
        .insert([{ user_id: userId, title: newTitle, video_url: expandedUrl, is_shared: newShared }])
        .select()

      if (!error && data) {
        setVideos((previous) => [data[0], ...previous])
        setActiveVideoId(data[0].id)
        setIsAdding(false)
        setNewTitle('')
        setNewUrl('')
        setNewFile(null)
        setNewShared(true)
        setAddMode('file')
        setAddError('')
      }
      return
    }

    if (!newFile) return

    setUploading(true)
    setAddError('')
    try {
      const formData = new FormData()
      formData.append('file', newFile)
      formData.append('bucket', 'videos')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al subir el video')
      }

      const { url } = await response.json()

      const { data, error } = await supabase
        .from('videos')
        .insert([{ user_id: userId, title: newTitle, video_url: url, is_shared: newShared }])
        .select()

      if (!error && data) {
        setVideos((previous) => [data[0], ...previous])
        setActiveVideoId(data[0].id)
        setIsAdding(false)
        setNewTitle('')
        setNewUrl('')
        setNewFile(null)
        setNewShared(true)
        setAddMode('file')
      }
    } catch (error) {
      console.error('Error:', error)
      setAddError('No se pudo subir el video. Intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveEdit = async (id: string) => {
    const { error } = await supabase
      .from('videos')
      .update({ title: editTitle, is_shared: editShared })
      .eq('id', id)
    if (!error) {
      setVideos(videos.map(v => v.id === id ? { ...v, title: editTitle, is_shared: editShared } : v))
      setEditingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    confirmDeleteToast({
      itemLabel: 'este video',
      onConfirm: async () => {
        await supabase.from('videos').delete().eq('id', id)
        setVideos((prev) => prev.filter((v) => v.id !== id))
        setActiveVideoId((prev) => (prev === id ? null : prev))
        setResolvedUrls((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      },
    })
  }

  const activeVideo = videos.find((video) => video.id === activeVideoId) ?? null
  const activeVideoUrl = activeVideo ? (resolvedUrls[activeVideo.id] ?? activeVideo.video_url) : ''
  const activeVideoEmbed = activeVideo ? resolveVideoEmbed(activeVideoUrl) : null

  if (isAdding) {
    return (
      <div className="absolute inset-0 flex flex-col p-3 pt-10 sm:p-5 sm:pt-5" style={{ ...SERIF, ...PAGE_FRAME_STYLE }}>
        <div className="flex items-center justify-between" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--nb-ink, #3a2518)' }}>Nuevo video</h3>
          <button
            onClick={() => {
              setIsAdding(false)
              setNewFile(null)
              setNewUrl('')
              setAddError('')
              setAddMode('file')
            }}
            style={{ color: 'var(--nb-accent, #8B4513)' }}
          >
            <X size={18} />
          </button>
        </div>
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Título del video..."
          disabled={uploading}
          className="w-full bg-transparent border-b-2 text-sm outline-none disabled:opacity-60"
          style={{ borderColor: 'var(--nb-border, #c4a87a)', color: 'var(--nb-ink, #3a2518)', ...SERIF, height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}
          autoFocus
        />

        <div className="flex items-center gap-2 py-2">
          <button
            onClick={() => { setAddMode('file'); setAddError('') }}
            className="px-2.5 py-1 rounded text-[11px] border transition-colors"
            style={{
              borderColor: addMode === 'file' ? 'var(--nb-accent, #8B4513)' : 'var(--nb-border, #c4a87a)',
              background: addMode === 'file' ? 'rgba(139,69,19,0.12)' : 'transparent',
              color: addMode === 'file' ? 'var(--nb-accent, #8B4513)' : '#6b5744',
            }}
          >
            Subir archivo
          </button>
          <button
            onClick={() => { setAddMode('url'); setAddError('') }}
            className="px-2.5 py-1 rounded text-[11px] border transition-colors"
            style={{
              borderColor: addMode === 'url' ? 'var(--nb-accent, #8B4513)' : 'var(--nb-border, #c4a87a)',
              background: addMode === 'url' ? 'rgba(139,69,19,0.12)' : 'transparent',
              color: addMode === 'url' ? 'var(--nb-accent, #8B4513)' : '#6b5744',
            }}
          >
            Pegar enlace
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center my-2">
          <div style={{ width: '100%' }}>
            {addMode === 'file' ? (
              <FileUploadInput
                onFileSelect={handleUploadFile}
                accept="video/*"
                disabled={uploading}
                loading={uploading}
              />
            ) : (
              <input
                value={newUrl}
                onChange={(event) => {
                  setNewUrl(event.target.value)
                  setAddError('')
                }}
                placeholder="https://youtube.com/watch?v=... o https://vimeo.com/..."
                disabled={uploading}
                className="w-full bg-transparent border-b-2 text-sm outline-none disabled:opacity-60"
                style={{ borderColor: 'var(--nb-border, #c4a87a)', color: 'var(--nb-ink, #3a2518)', ...SERIF, height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}
              />
            )}
          </div>
        </div>

        {addMode === 'file' && newFile && (
          <p className="text-xs text-center mb-2" style={{ color: 'var(--nb-muted, #8B7355)' }}>
            Archivo seleccionado: {newFile.name}
          </p>
        )}
        {addMode === 'url' && (
          <p className="text-[10px] mb-2" style={{ color: 'var(--nb-muted, #8B7355)' }}>
            Compatible: YouTube, Vimeo y enlaces directos a video. Tambien short links.
          </p>
        )}
        {addError && (
          <p className="text-[10px] mb-2" style={{ color: '#9b4040' }}>
            {addError}
          </p>
        )}
        <div className="flex-1" />
        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--nb-line, #d4c5a9)' }}>
          <button
            onClick={() => setNewShared(s => !s)}
            disabled={uploading}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full disabled:opacity-60 transition-all"
            style={{
              background: newShared ? 'rgba(184,134,11,0.15)' : 'rgba(139,69,19,0.1)',
              color: newShared ? 'var(--nb-gold-dark, #8B6914)' : 'var(--nb-accent, #8B4513)',
              border: `1px solid ${newShared ? 'var(--nb-gold, #B8860B)' : 'var(--nb-accent, #8B4513)'}`,
            }}
          >
            {newShared ? <Users size={12} /> : <Lock size={12} />}
            {newShared ? 'Compartido' : 'Privado'}
          </button>
          <button
            onClick={handleAdd}
            disabled={
              uploading ||
              resolvingAddUrl ||
              !newTitle.trim() ||
              (addMode === 'file' ? !newFile : !newUrl.trim())
            }
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium disabled:opacity-40"
            style={{ background: 'var(--nb-accent, #8B4513)', color: '#f5ecd8' }}
          >
            <Save size={14} /> {uploading ? 'Subiendo...' : resolvingAddUrl ? 'Procesando...' : 'Guardar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex flex-col p-3 pt-10 sm:p-5 sm:pt-5" style={PAGE_FRAME_STYLE}>
      <div className="flex items-center justify-between" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--nb-ink, #3a2518)', ...SERIF }}>Nuestros Videos</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded"
          style={{ background: 'var(--nb-accent, #8B4513)', color: '#f5ecd8' }}
        >
          <Plus size={12} /> Nuevo
        </button>
      </div>

      {/* Subtitle */}
      <p className="text-[10px]" style={{ color: 'var(--nb-muted, #8B7355)', height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
        {videos.length} {videos.length === 1 ? 'video' : 'videos'}
      </p>

      <div
        className="rounded-lg border p-2 mb-2"
        style={{ borderColor: 'var(--nb-line, #d4c5a9)', background: 'rgba(245,236,216,0.45)' }}
      >
        {activeVideo ? (
          <>
            <div className="flex items-center justify-between gap-2 pb-2">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--nb-ink, #3a2518)', ...SERIF }}>
                {activeVideo.title}
              </p>
              <span
                className="text-[9px] px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: activeVideo.is_shared ? 'rgba(184,134,11,0.1)' : 'rgba(139,69,19,0.07)',
                  color: activeVideo.is_shared ? 'var(--nb-gold-dark, #8B6914)' : 'var(--nb-accent, #8B4513)',
                }}
              >
                {activeVideo.is_shared ? 'compartido' : 'privado'}
              </span>
            </div>

            {activeVideoEmbed?.kind === 'video' && (
              <video
                key={activeVideo.id}
                controls
                preload="metadata"
                className="w-full rounded bg-[#2a1508]"
                style={{ maxHeight: '280px' }}
                src={activeVideoEmbed.src}
              />
            )}

            {activeVideoEmbed?.kind === 'iframe' && (
              <iframe
                key={activeVideo.id}
                src={activeVideoEmbed.src}
                title={activeVideoEmbed.title}
                className="w-full rounded border-0 bg-black/10"
                style={{ height: `${activeVideoEmbed.height ?? 246}px` }}
                allow={activeVideoEmbed.allow}
                loading="lazy"
                allowFullScreen
              />
            )}

            {(activeVideoEmbed?.kind === 'unsupported' || activeVideoEmbed?.kind === 'audio') && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px]" style={{ color: 'var(--nb-muted, #8B7355)', ...SERIF }}>
                  Esta URL no se puede reproducir dentro de la libreta.
                </p>
                <a
                  href={activeVideoUrl}
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
            Selecciona un video para reproducir.
          </div>
        )}
      </div>

      <div className="notebook-scroll flex-1 min-h-0 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-xs text-center pt-8" style={{ color: 'var(--nb-muted, #8B7355)', ...SERIF }}>Cargando...</p>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2">
            <Film size={28} style={{ color: 'var(--nb-border, #c4a87a)' }} strokeWidth={1} />
            <p className="text-xs text-center" style={{ color: 'var(--nb-muted, #8B7355)', ...SERIF }}>Sin videos aún</p>
          </div>
        ) : (
          videos.map((v, i) => (
            <div
              key={v.id}
              onClick={() => {
                if (editingId !== v.id) setActiveVideoId(v.id)
              }}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && editingId !== v.id) {
                  event.preventDefault()
                  setActiveVideoId(v.id)
                }
              }}
              role="button"
              tabIndex={0}
              className="flex items-center gap-3 transition-all hover:bg-amber-50/40 group cursor-pointer"
              style={{
                height: `${LINE_H * 2}px`,
                borderBottom: '1px solid rgba(180,150,100,0.15)',
                background: activeVideoId === v.id ? 'rgba(139,69,19,0.08)' : 'transparent',
              }}
            >
              <span className="text-[10px] w-5 text-right flex-shrink-0" style={{ color: '#b8a070', ...SERIF }}>
                {i + 1}
              </span>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setActiveVideoId(v.id)
                }}
                className="h-6 w-6 rounded-full inline-flex items-center justify-center flex-shrink-0"
                style={{
                  background: activeVideoId === v.id ? 'var(--nb-accent, #8B4513)' : 'rgba(139,69,19,0.12)',
                  color: activeVideoId === v.id ? '#f5ecd8' : 'var(--nb-accent, #8B4513)',
                }}
                aria-label={`Reproducir ${v.title}`}
              >
                <Play size={11} fill="currentColor" />
              </button>

              <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ height: `${LINE_H * 2}px` }}>
                {editingId === v.id ? (
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-transparent border-b outline-none text-xs"
                    style={{ borderColor: 'var(--nb-border, #c4a87a)', color: 'var(--nb-ink, #3a2518)', ...SERIF, lineHeight: `${LINE_H}px` }}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit(v.id)}
                  />
                ) : (
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--nb-ink, #3a2518)', ...SERIF, lineHeight: `${LINE_H}px` }}>{v.title}</p>
                )}
              </div>

              {editingId === v.id ? (
                <button
                  onClick={() => setEditShared(s => !s)}
                  className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: editShared ? 'rgba(184,134,11,0.15)' : 'rgba(139,69,19,0.1)',
                    color: editShared ? 'var(--nb-gold-dark, #8B6914)' : 'var(--nb-accent, #8B4513)',
                    border: `1px solid ${editShared ? 'var(--nb-gold, #B8860B)' : 'var(--nb-accent, #8B4513)'}`,
                  }}
                >
                  {editShared ? 'compartido' : 'privado'}
                </button>
              ) : (
                <span
                  className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: v.is_shared ? 'rgba(184,134,11,0.1)' : 'rgba(139,69,19,0.07)',
                    color: v.is_shared ? 'var(--nb-gold-dark, #8B6914)' : 'var(--nb-accent, #8B4513)',
                  }}
                >
                  {v.is_shared ? '♥' : '🔒'}
                </span>
              )}

              {editingId === v.id ? (
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={(event) => { event.stopPropagation(); handleSaveEdit(v.id) }} style={{ color: '#4a7c3f' }}><Save size={13} /></button>
                  <button onClick={(event) => { event.stopPropagation(); setEditingId(null) }} style={{ color: 'var(--nb-accent, #8B4513)' }}><X size={13} /></button>
                </div>
              ) : (
                <div className="flex gap-1 flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  {v.user_id === userId && (
                    <>
                      <button
                        onClick={(event) => {
                          event.stopPropagation()
                          setEditingId(v.id); setEditTitle(v.title); setEditShared(v.is_shared)
                        }}
                        style={{ color: '#6b5744' }}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button onClick={(event) => { event.stopPropagation(); handleDelete(v.id) }} style={{ color: '#9b4040' }}>
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

