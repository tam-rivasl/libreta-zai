'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Save, X, Lock, Users, Mic, Play, Square } from 'lucide-react'
import { LINE_H } from '@/components/notebook-interior'
import { NOTEBOOK_FONT_FAMILY_CSS_VAR } from '@/lib/notebook-style'
import { confirmDeleteToast } from '@/lib/confirm-toast'

interface AudioNote {
  id: string
  title: string
  audio_url: string
  duration: number
  is_shared: boolean
  created_at: string
  user_id: string
}

interface AudioPageProps {
  userId: string
}

const SERIF = { fontFamily: NOTEBOOK_FONT_FAMILY_CSS_VAR }
const PAGE_FRAME_STYLE = {
  paddingLeft: 'clamp(14px, 7vw, 52px)',
  paddingRight: 'clamp(14px, 7vw, 52px)',
}

export function AudioPage({ userId }: AudioPageProps) {
  const [notes, setNotes] = useState<AudioNote[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editShared, setEditShared] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newShared, setNewShared] = useState(true)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const supabase = createClient()

  useEffect(() => { loadNotes() }, [])

  const loadNotes = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('audio_notes')
      .select('*')
      .or(`user_id.eq.${userId},is_shared.eq.true`)
      .order('created_at', { ascending: false })
    setNotes(data || [])
    setLoading(false)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        const { data, error } = await supabase
          .from('audio_notes')
          .insert([{ user_id: userId, title: newTitle, audio_url: url, duration: 0, is_shared: newShared }])
          .select()
        if (!error && data) {
          setNotes([data[0], ...notes])
          setIsAdding(false)
          setNewTitle(''); setNewShared(true)
        }
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      setIsRecording(true)
    } catch {}
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    setIsRecording(false)
  }

  const handleSaveEdit = async (id: string) => {
    const { error } = await supabase
      .from('audio_notes')
      .update({ title: editTitle, is_shared: editShared })
      .eq('id', id)
    if (!error) {
      setNotes(notes.map(n => n.id === id ? { ...n, title: editTitle, is_shared: editShared } : n))
      setEditingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    confirmDeleteToast({
      itemLabel: 'esta nota de voz',
      onConfirm: async () => {
        await supabase.from('audio_notes').delete().eq('id', id)
        setNotes((prev) => prev.filter((n) => n.id !== id))
      },
    })
  }

  if (isAdding) {
    return (
      <div className="absolute inset-0 flex flex-col p-3 pt-10 sm:p-5 sm:pt-5" style={{ ...SERIF, ...PAGE_FRAME_STYLE }}>
        <div className="flex items-center justify-between" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--nb-ink, #3a2518)' }}>Grabar nota</h3>
          <button onClick={() => { setIsAdding(false); stopRecording() }} style={{ color: 'var(--nb-accent, #8B4513)' }}><X size={18} /></button>
        </div>
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Título de la nota..."
          disabled={isRecording}
          className="w-full bg-transparent border-b-2 text-sm outline-none disabled:opacity-60"
          style={{ borderColor: 'var(--nb-border, #c4a87a)', color: 'var(--nb-ink, #3a2518)', ...SERIF, height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}
          autoFocus
        />

        {/* Recording indicator */}
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          {isRecording && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full animate-pulse" style={{ background: '#c0392b' }} />
              <span className="text-xs" style={{ color: 'var(--nb-accent, #8B4513)', ...SERIF }}>Grabando...</span>
            </div>
          )}

          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!newTitle.trim() && !isRecording}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium disabled:opacity-40 transition-all"
            style={{ background: isRecording ? '#c0392b' : 'var(--nb-accent, #8B4513)', color: '#f5ecd8' }}
          >
            {isRecording ? <><Square size={16} /> Detener</> : <><Mic size={16} /> Grabar</>}
          </button>
        </div>

        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--nb-line, #d4c5a9)' }}>
          <button
            onClick={() => setNewShared(s => !s)}
            disabled={isRecording}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full disabled:opacity-60"
            style={{
              background: newShared ? 'rgba(184,134,11,0.15)' : 'rgba(139,69,19,0.1)',
              color: newShared ? 'var(--nb-gold-dark, #8B6914)' : 'var(--nb-accent, #8B4513)',
              border: `1px solid ${newShared ? 'var(--nb-gold, #B8860B)' : 'var(--nb-accent, #8B4513)'}`,
            }}
          >
            {newShared ? <Users size={12} /> : <Lock size={12} />}
            {newShared ? 'Compartida' : 'Privada'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex flex-col p-3 pt-10 sm:p-5 sm:pt-5" style={PAGE_FRAME_STYLE}>
      <div className="flex items-center justify-between" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--nb-ink, #3a2518)', ...SERIF }}>Notas de Voz</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded"
          style={{ background: 'var(--nb-accent, #8B4513)', color: '#f5ecd8' }}
        >
          <Plus size={12} /> Grabar
        </button>
      </div>
      
      {/* Subtitle */}
      <p className="text-[10px]" style={{ color: 'var(--nb-muted, #8B7355)', height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
        {notes.length} {notes.length === 1 ? 'nota' : 'notas'}
      </p>

      <div className="notebook-scroll flex-1 min-h-0 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-xs text-center pt-8" style={{ color: 'var(--nb-muted, #8B7355)', ...SERIF }}>Cargando...</p>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2">
            <Mic size={28} style={{ color: 'var(--nb-border, #c4a87a)' }} strokeWidth={1} />
            <p className="text-xs text-center" style={{ color: 'var(--nb-muted, #8B7355)', ...SERIF }}>Sin notas de voz aún</p>
          </div>
        ) : (
          notes.map((n, i) => (
            <div
              key={n.id}
              className="flex items-center gap-3 transition-all hover:bg-amber-50/40 group"
              style={{ height: `${LINE_H * 2}px`, borderBottom: '1px solid rgba(180,150,100,0.15)' }}
            >
              <span className="text-[10px] w-5 text-right flex-shrink-0" style={{ color: '#b8a070', ...SERIF }}>
                {i + 1}
              </span>

              {/* Play button */}
              <button
                onClick={() => setPlayingId(playingId === n.id ? null : n.id)}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-colors"
                style={{
                  background: playingId === n.id ? 'var(--nb-accent, #8B4513)' : 'rgba(139,69,19,0.12)',
                  color: playingId === n.id ? '#f5ecd8' : 'var(--nb-accent, #8B4513)',
                }}
              >
                <Play size={10} fill="currentColor" />
              </button>

              <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ height: `${LINE_H * 2}px` }}>
                {editingId === n.id ? (
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-transparent border-b outline-none text-xs"
                    style={{ borderColor: 'var(--nb-border, #c4a87a)', color: 'var(--nb-ink, #3a2518)', ...SERIF, lineHeight: `${LINE_H}px` }}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit(n.id)}
                  />
                ) : (
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--nb-ink, #3a2518)', ...SERIF, lineHeight: `${LINE_H}px` }}>{n.title}</p>
                )}
              </div>

              {editingId === n.id ? (
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
                    background: n.is_shared ? 'rgba(184,134,11,0.1)' : 'rgba(139,69,19,0.07)',
                    color: n.is_shared ? 'var(--nb-gold-dark, #8B6914)' : 'var(--nb-accent, #8B4513)',
                  }}
                >
                  {n.is_shared ? '♥' : '🔒'}
                </span>
              )}

              {editingId === n.id ? (
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => handleSaveEdit(n.id)} style={{ color: '#4a7c3f' }}><Save size={13} /></button>
                  <button onClick={() => setEditingId(null)} style={{ color: 'var(--nb-accent, #8B4513)' }}><X size={13} /></button>
                </div>
              ) : (
                <div className="flex gap-1 flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  {n.user_id === userId && (
                    <>
                      <button onClick={() => { setEditingId(n.id); setEditTitle(n.title); setEditShared(n.is_shared) }} style={{ color: '#6b5744' }}>
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => handleDelete(n.id)} style={{ color: '#9b4040' }}>
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              )}

              {playingId === n.id && (
                <audio src={n.audio_url} autoPlay onEnded={() => setPlayingId(null)} className="hidden" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

