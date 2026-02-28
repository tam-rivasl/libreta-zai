'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Save, X, Lock, Users } from 'lucide-react'
import Autoplay from 'embla-carousel-autoplay'
import { LINE_H } from '@/components/notebook-interior'
import { FileUploadInput } from '@/components/ui/file-upload-input'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel'
import { NOTEBOOK_FONT_FAMILY_CSS_VAR } from '@/lib/notebook-style'
import { confirmDeleteToast } from '@/lib/confirm-toast'

interface Photo {
  id: string
  title: string
  image_url: string
  is_shared: boolean
  created_at: string
  user_id: string
}

interface GalleryPageProps {
  userId: string
}

const SERIF = { fontFamily: NOTEBOOK_FONT_FAMILY_CSS_VAR }
const PAGE_FRAME_STYLE = {
  paddingLeft: 'clamp(14px, 7vw, 52px)',
  paddingRight: 'clamp(14px, 7vw, 52px)',
}

export function GalleryPage({ userId }: GalleryPageProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [photoAspectById, setPhotoAspectById] = useState<Record<string, number>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editShared, setEditShared] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [newShared, setNewShared] = useState(true)
  const [uploading, setUploading] = useState(false)
  const plugin = useRef(
    Autoplay({ delay: 2000, stopOnInteraction: true }),
  )
  const supabase = createClient()

  useEffect(() => {
    loadPhotos()
  }, [])

  useEffect(() => {
    if (!carouselApi) return

    const onSelect = () => {
      setCarouselIndex(carouselApi.selectedScrollSnap())
    }

    onSelect()
    carouselApi.on('select', onSelect)
    carouselApi.on('reInit', onSelect)

    return () => {
      carouselApi.off('select', onSelect)
      carouselApi.off('reInit', onSelect)
    }
  }, [carouselApi])

  const loadPhotos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('gallery')
      .select('*')
      .or(`user_id.eq.${userId},is_shared.eq.true`)
      .order('created_at', { ascending: false })
    setPhotos(data || [])
    setLoading(false)
  }

  const handleUploadFile = (file: File) => {
    setNewFile(file)
  }

  const handleAdd = async () => {
    if (!newTitle.trim() || !newFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', newFile)
      formData.append('bucket', 'photos')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al subir la imagen')
      }

      const { url } = await response.json()

      const { data, error } = await supabase
        .from('gallery')
        .insert([{ user_id: userId, title: newTitle, image_url: url, is_shared: newShared }])
        .select()

      if (!error && data) {
        setPhotos([data[0], ...photos])
        setCarouselIndex(0)
        carouselApi?.scrollTo(0)
        setIsAdding(false)
        setNewTitle('')
        setNewFile(null)
        setNewShared(true)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al subir la foto')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveEdit = async () => {
    const p = photos[carouselIndex]
    if (!p) return
    const { error } = await supabase
      .from('gallery')
      .update({ title: editTitle, is_shared: editShared })
      .eq('id', p.id)
    if (!error) {
      setPhotos(photos.map(x => x.id === p.id ? { ...x, title: editTitle, is_shared: editShared } : x))
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    const p = photos[carouselIndex]
    if (!p) return

    confirmDeleteToast({
      itemLabel: 'esta foto',
      onConfirm: async () => {
        await supabase.from('gallery').delete().eq('id', p.id)
        const updated = photos.filter((x) => x.id !== p.id)
        const nextIndex = Math.max(0, carouselIndex - 1)
        setPhotos(updated)
        setCarouselIndex(nextIndex)
        carouselApi?.scrollTo(nextIndex)
      },
    })
  }

  const current = photos[carouselIndex]
  const isOwner = current?.user_id === userId
  const currentAspect = current ? photoAspectById[current.id] ?? 4 / 3 : 4 / 3
  const currentFrameWidth =
    currentAspect < 0.92
      ? 'min(100%, 260px)'
      : currentAspect > 1.65
        ? 'min(100%, 560px)'
        : 'min(100%, 500px)'

  if (isAdding) {
    return (
      <div className="absolute inset-0 flex flex-col p-3 pt-10 sm:p-5 sm:pt-5" style={{ ...SERIF, ...PAGE_FRAME_STYLE }}>
        <div className="flex items-center justify-between" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--nb-ink, #3a2518)' }}>Nueva foto</h3>
          <button onClick={() => { setIsAdding(false); setNewFile(null) }} style={{ color: 'var(--nb-accent, #8B4513)' }}>
            <X size={18} />
          </button>
        </div>

        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Título de la foto..."
          disabled={uploading}
          className="w-full bg-transparent border-b-2 text-sm outline-none disabled:opacity-60"
          style={{ borderColor: 'var(--nb-border, #c4a87a)', color: 'var(--nb-ink, #3a2518)', ...SERIF, height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}
          autoFocus
        />

        <div className="flex-1 flex items-center justify-center my-4">
          <div style={{ width: '100%' }}>
            <FileUploadInput
              onFileSelect={handleUploadFile}
              accept="image/*"
              disabled={uploading}
              loading={uploading}
            />
          </div>
        </div>

        {newFile && (
          <p className="text-xs text-center mb-2" style={{ color: 'var(--nb-muted, #8B7355)' }}>
            Archivo seleccionado: {newFile.name}
          </p>
        )}

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
            {newShared ? 'Compartida' : 'Privada'}
          </button>
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim() || !newFile || uploading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium disabled:opacity-40"
            style={{ background: 'var(--nb-accent, #8B4513)', color: '#f5ecd8' }}
          >
            <Save size={14} /> {uploading ? 'Subiendo...' : 'Guardar'}
          </button>
        </div>
      </div>
    )
  }

  if (isEditing && current) {
    return (
      <div className="absolute inset-0 flex flex-col p-3 pt-10 sm:p-5 sm:pt-5" style={{ ...SERIF, ...PAGE_FRAME_STYLE }}>
        <div className="flex items-center justify-between" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--nb-ink, #3a2518)' }}>Editar foto</h3>
          <button onClick={() => setIsEditing(false)} style={{ color: 'var(--nb-accent, #8B4513)' }}>
            <X size={18} />
          </button>
        </div>

        <input
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          className="w-full bg-transparent border-b-2 text-sm outline-none"
          style={{ borderColor: 'var(--nb-border, #c4a87a)', color: 'var(--nb-ink, #3a2518)', ...SERIF, height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}
        />

        <div className="flex-1" />

        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--nb-line, #d4c5a9)' }}>
          <button
            onClick={() => setEditShared(s => !s)}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
            style={{
              background: editShared ? 'rgba(184,134,11,0.15)' : 'rgba(139,69,19,0.1)',
              color: editShared ? 'var(--nb-gold-dark, #8B6914)' : 'var(--nb-accent, #8B4513)',
              border: `1px solid ${editShared ? 'var(--nb-gold, #B8860B)' : 'var(--nb-accent, #8B4513)'}`,
            }}
          >
            {editShared ? <Users size={12} /> : <Lock size={12} />}
            {editShared ? 'Compartida' : 'Privada'}
          </button>
          <button
            onClick={handleSaveEdit}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium"
            style={{ background: 'var(--nb-accent, #8B4513)', color: '#f5ecd8' }}
          >
            <Save size={14} /> Guardar
          </button>
        </div>
      </div>
    )
  }

  if (!loading && photos.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 gap-4">
        <p className="text-sm text-center" style={{ color: 'var(--nb-muted, #8B7355)', ...SERIF }}>
          Sin fotos aún. ¡Agrega la primera!
        </p>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded text-xs"
          style={{ background: 'var(--nb-accent, #8B4513)', color: '#f5ecd8' }}
        >
          <Plus size={14} /> Agregar foto
        </button>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex flex-col p-3 pt-10 sm:p-5 sm:pt-5" style={PAGE_FRAME_STYLE}>
      <div className="flex items-center justify-between" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--nb-ink, #3a2518)', ...SERIF }}>
          Galería
        </h2>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded"
          style={{ background: 'var(--nb-accent, #8B4513)', color: '#f5ecd8' }}
        >
          <Plus size={12} /> Agregar
        </button>
      </div>

      {current && (
        <p className="text-[10px]" style={{ color: 'var(--nb-muted, #8B7355)', height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
          {carouselIndex + 1} / {photos.length}
        </p>
      )}

      <div className="flex-1 min-h-0 flex items-center justify-center py-1">
        <div
          className="relative rounded overflow-hidden shrink-0"
          style={{
            width: currentFrameWidth,
            maxWidth: '100%',
            maxHeight: '100%',
            aspectRatio: `${currentAspect}`,
            border: '3px solid var(--nb-border, #c4a87a)',
            boxShadow: 'inset 0 0 12px rgba(0,0,0,0.08), 0 3px 10px rgba(0,0,0,0.15)',
            background: '#2a1508',
          }}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-xs" style={{ color: 'var(--nb-line, #d4c5a9)', ...SERIF }}>Cargando...</p>
            </div>
          ) : (
            <Carousel
              setApi={setCarouselApi}
              plugins={[plugin.current]}
              opts={{ loop: photos.length > 1 }}
              className="h-full w-full"
              onMouseEnter={plugin.current.stop}
              onMouseLeave={plugin.current.reset}
            >
              <CarouselContent className="h-full -ml-0">
                {photos.map((photo) => (
                  <CarouselItem key={photo.id} className="h-full basis-full pl-0">
                    <div className="relative h-full w-full flex items-center justify-center p-2 sm:p-3">
                        <img
                          src={photo.image_url}
                          alt={photo.title}
                          className="h-full w-full object-contain bg-[#2a1508]"
                          loading="lazy"
                          onLoad={(event) => {
                            const { naturalWidth, naturalHeight } = event.currentTarget
                            if (!naturalWidth || !naturalHeight) return
                            const nextAspect = naturalWidth / naturalHeight
                            setPhotoAspectById((prev) => {
                              const prevAspect = prev[photo.id]
                              if (typeof prevAspect === 'number' && Math.abs(prevAspect - nextAspect) < 0.001) {
                                return prev
                              }
                              return { ...prev, [photo.id]: nextAspect }
                            })
                          }}
                          onError={(event) => {
                            event.currentTarget.src = '/placeholder.jpg'
                          }}
                        />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>

              {photos.length > 1 && (
                <>
                  <CarouselPrevious
                    className="left-2 top-1/2 -translate-y-1/2 border-0"
                    style={{
                      background: 'rgba(42,21,8,0.65)',
                      color: '#f5ecd8',
                    }}
                  />
                  <CarouselNext
                    className="right-2 top-1/2 -translate-y-1/2 border-0"
                    style={{
                      background: 'rgba(42,21,8,0.65)',
                      color: '#f5ecd8',
                    }}
                  />
                  <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 flex gap-1.5">
                    {photos.map((photo, i) => (
                      <button
                        key={photo.id}
                        onClick={() => carouselApi?.scrollTo(i)}
                        className="rounded-full transition-all"
                        style={{
                          width: i === carouselIndex ? '16px' : '6px',
                          height: '6px',
                          background: i === carouselIndex ? '#f5ecd8' : 'rgba(245,236,216,0.5)',
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </Carousel>
          )}
        </div>
      </div>

      {current && (
        <div className="flex items-center justify-between pt-2" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--nb-ink, #3a2518)', ...SERIF }}>
              {current.title}
            </p>
            <p className="text-[9px]" style={{ color: '#a08c70' }}>
              {new Date(current.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              {' · '}
              <span style={{ color: current.is_shared ? 'var(--nb-gold-dark, #8B6914)' : 'var(--nb-accent, #8B4513)' }}>
                {current.is_shared ? 'compartida' : 'privada'}
              </span>
            </p>
          </div>
          {isOwner && (
            <div className="flex gap-2 ml-2 flex-shrink-0">
              <button
                onClick={() => { setEditTitle(current.title); setEditShared(current.is_shared); setIsEditing(true) }}
                style={{ color: '#6b5744' }}
              >
                <Edit2 size={13} />
              </button>
              <button onClick={handleDelete} style={{ color: '#9b4040' }}>
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

