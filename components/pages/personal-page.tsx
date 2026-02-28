'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Save, X, Lock, ChevronLeft, PenTool } from 'lucide-react'
import { LINE_H } from '@/components/notebook-interior'
import { NOTEBOOK_FONT_FAMILY_CSS_VAR } from '@/lib/notebook-style'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { confirmDeleteToast } from '@/lib/confirm-toast'
import {
  hasMeaningfulRichText,
  normalizeRichTextContent,
  sanitizeRichTextHtml,
} from '@/lib/rich-text'

interface PersonalNote {
  id: string
  title: string
  content: string
  created_at: string
  user_id: string
  source?: 'note' | 'writing' // to distinguish origin
}

interface PersonalPageProps {
  userId: string
}

const SERIF = { fontFamily: NOTEBOOK_FONT_FAMILY_CSS_VAR }
const PAGE_FRAME_STYLE = {
  paddingLeft: 'clamp(14px, 7vw, 52px)',
  paddingRight: 'clamp(14px, 7vw, 52px)',
}

export function PersonalPage({ userId }: PersonalPageProps) {
  const [notes, setNotes] = useState<PersonalNote[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingIndex, setViewingIndex] = useState<number | null>(null) // null = list
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const supabase = createClient()

  useEffect(() => { loadNotes() }, [])

  const loadNotes = async () => {
    setLoading(true)
    // Load personal notes
    const { data: personalData } = await supabase
      .from('personal_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Load private writings (is_shared = false) belonging to this user
    const { data: writingsData } = await supabase
      .from('writings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_shared', false)
      .order('created_at', { ascending: false })

    const combined: PersonalNote[] = [
      ...(personalData || []).map((n: any) => ({ ...n, source: 'note' as const })),
      ...(writingsData || []).map((w: any) => ({
        id: w.id,
        title: w.title,
        content: w.content,
        created_at: w.created_at,
        user_id: w.user_id,
        source: 'writing' as const,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setNotes(combined)
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!newTitle.trim() || !hasMeaningfulRichText(newContent)) return
    const { data, error } = await supabase
      .from('personal_notes')
      .insert([{ user_id: userId, title: newTitle, content: newContent }])
      .select()
    if (!error && data) {
      setNotes([data[0], ...notes])
      setIsCreating(false)
      setNewTitle(''); setNewContent('')
      setViewingIndex(0)
    }
  }

  const handleSaveEdit = async () => {
    if (viewingIndex === null) return
    const n = notes[viewingIndex]
    if (!editTitle.trim() || !hasMeaningfulRichText(editContent)) return
    const { error } = await supabase
      .from('personal_notes')
      .update({ title: editTitle, content: editContent })
      .eq('id', n.id)
    if (!error) {
      setNotes(notes.map(x => x.id === n.id ? { ...x, title: editTitle, content: editContent } : x))
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    if (viewingIndex === null) return
    const n = notes[viewingIndex]
    confirmDeleteToast({
      itemLabel: 'esta nota',
      onConfirm: async () => {
        await supabase.from('personal_notes').delete().eq('id', n.id)
        setNotes((prev) => prev.filter((x) => x.id !== n.id))
        setViewingIndex(null)
      },
    })
  }

  // ── Create form ──
  if (isCreating) {
    return (
      <div className="absolute inset-0 flex flex-col p-3 pt-10 sm:p-5 sm:pt-5" style={{ ...SERIF, ...PAGE_FRAME_STYLE }}>
        <div className="flex items-center justify-between" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
          <div className="flex items-center gap-2">
            <Lock size={14} style={{ color: 'var(--nb-accent, #8B4513)' }} />
            <h3 className="text-base font-semibold" style={{ color: 'var(--nb-ink, #3a2518)' }}>Nota privada</h3>
          </div>
          <button onClick={() => setIsCreating(false)} style={{ color: 'var(--nb-accent, #8B4513)' }}>
            <X size={18} />
          </button>
        </div>

        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Título..."
          className="w-full bg-transparent border-b-2 text-base outline-none"
          style={{ borderColor: 'var(--nb-border, #c4a87a)', color: 'var(--nb-ink, #3a2518)', ...SERIF, height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}
          autoFocus
        />

        <div className="flex-1 min-h-0 pt-2">
          <RichTextEditor
            value={newContent}
            onChange={setNewContent}
            placeholder="Solo tú podrás leer esto..."
            lineHeight={LINE_H}
          />
        </div>

        <div className="flex justify-end pt-3" style={{ borderTop: '1px solid var(--nb-line, #d4c5a9)' }}>
          <button
            onClick={handleCreate}
            disabled={!newTitle.trim() || !hasMeaningfulRichText(newContent)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium disabled:opacity-40"
            style={{ background: 'var(--nb-accent, #8B4513)', color: '#f5ecd8' }}
          >
            <Save size={14} /> Guardar
          </button>
        </div>
      </div>
    )
  }

  // ── Edit form ──
  if (isEditing && viewingIndex !== null) {
    const n = notes[viewingIndex]
    return (
      <div className="absolute inset-0 flex flex-col p-3 pt-10 sm:p-5 sm:pt-5" style={{ ...SERIF, ...PAGE_FRAME_STYLE }}>
        <div className="flex items-center justify-between" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--nb-ink, #3a2518)' }}>Editar nota</h3>
          <button onClick={() => setIsEditing(false)} style={{ color: 'var(--nb-accent, #8B4513)' }}>
            <X size={18} />
          </button>
        </div>

        <input
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          className="w-full bg-transparent border-b-2 text-base outline-none"
          style={{ borderColor: 'var(--nb-border, #c4a87a)', color: 'var(--nb-ink, #3a2518)', ...SERIF, height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}
        />

        <div className="flex-1 min-h-0 pt-2">
          <RichTextEditor
            value={editContent}
            onChange={setEditContent}
            lineHeight={LINE_H}
          />
        </div>

        <div className="flex justify-end pt-3" style={{ borderTop: '1px solid var(--nb-line, #d4c5a9)' }}>
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

  // ── Single note view ──
  if (viewingIndex !== null) {
    const n = notes[viewingIndex]
    return (
      <div className="absolute inset-0 flex flex-col p-3 pt-10 sm:p-5 sm:pt-5" style={PAGE_FRAME_STYLE}>
        <div className="flex items-center justify-between" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
          <button
            onClick={() => setViewingIndex(null)}
            className="flex items-center gap-1 text-[11px] hover:opacity-70"
            style={{ color: 'var(--nb-accent, #8B4513)' }}
          >
            <ChevronLeft size={14} /> Mis notas
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => { setEditTitle(n.title); setEditContent(n.content); setIsEditing(true) }}
              style={{ color: '#6b5744' }}
            >
              <Edit2 size={14} />
            </button>
            <button onClick={handleDelete} style={{ color: '#9b4040' }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
            <Lock size={12} style={{ color: 'var(--nb-accent, #8B4513)', flexShrink: 0 }} />
            <h3 className="text-base font-semibold truncate" style={{ color: 'var(--nb-ink, #3a2518)', ...SERIF }}>
              {n.title}
            </h3>
          </div>
          <p className="text-[10px]" style={{ color: '#a08c70', height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
            {new Date(n.created_at).toLocaleDateString('es-ES', {
              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
            })}
          </p>
          <div className="flex-1 overflow-hidden">
            <div
              className="notebook-scroll h-full overflow-y-auto text-sm [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
              style={{ color: 'var(--nb-ink, #3a2518)', ...SERIF, lineHeight: `${LINE_H}px` }}
              dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(normalizeRichTextContent(n.content)) }}
            />
          </div>
        </div>

        <div
          className="flex items-center justify-between pt-2"
          style={{ borderTop: '1px solid rgba(180,150,100,0.3)', height: `${LINE_H}px` }}
        >
          <button
            onClick={() => setViewingIndex(v => Math.max(0, (v ?? 0) - 1))}
            disabled={viewingIndex <= 0}
            className="flex items-center gap-1 text-[11px] disabled:opacity-30 hover:opacity-70"
            style={{ color: 'var(--nb-accent, #8B4513)' }}
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          <span className="text-[10px]" style={{ color: '#b8a070', ...SERIF }}>
            {viewingIndex + 1} / {notes.length}
          </span>
          <button
            onClick={() => setViewingIndex(v => Math.min(notes.length - 1, (v ?? 0) + 1))}
            disabled={viewingIndex >= notes.length - 1}
            className="flex items-center gap-1 text-[11px] disabled:opacity-30 hover:opacity-70"
            style={{ color: 'var(--nb-accent, #8B4513)' }}
          >
            Siguiente <ChevronLeft size={14} className="rotate-180" />
          </button>
        </div>
      </div>
    )
  }

  // ── Menu / list ──
  return (
    <div className="absolute inset-0 flex flex-col p-3 pt-10 sm:p-5 sm:pt-5" style={PAGE_FRAME_STYLE}>
      {/* Header — aligned to first line */}
      <div className="flex items-center justify-between" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
        <div className="flex items-center gap-1.5">
          <Lock size={13} style={{ color: 'var(--nb-accent, #8B4513)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--nb-ink, #3a2518)', ...SERIF }}>
            Mi Espacio Personal
          </h2>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded"
          style={{ background: 'var(--nb-accent, #8B4513)', color: '#f5ecd8' }}
        >
          <Plus size={12} /> Nueva
        </button>
      </div>
      
      {/* Subtitle */}
      <p className="text-[10px]" style={{ color: 'var(--nb-muted, #8B7355)', height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
        {notes.length} {notes.length === 1 ? 'entrada privada' : 'entradas privadas'}
      </p>

      <div className="notebook-scroll flex-1 min-h-0 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-xs text-center pt-8" style={{ color: 'var(--nb-muted, #8B7355)', ...SERIF }}>Cargando...</p>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Lock size={28} style={{ color: 'var(--nb-border, #c4a87a)' }} strokeWidth={1} />
            <p className="text-sm text-center" style={{ color: 'var(--nb-muted, #8B7355)', ...SERIF }}>
              Aún no tienes notas privadas.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {notes.map((n, i) => (
              <button
                key={`${n.source}-${n.id}`}
                onClick={() => setViewingIndex(i)}
                className="flex items-center gap-3 text-left transition-all active:opacity-60"
                style={{ height: `${LINE_H * 2}px`, borderBottom: '1px solid rgba(180,150,100,0.15)' }}
              >
                <span className="text-[11px] flex-shrink-0 w-5 text-right" style={{ color: '#b8a070', fontFamily: NOTEBOOK_FONT_FAMILY_CSS_VAR }}>
                  {i + 1}
                </span>
                <div
                  className="flex items-center justify-center flex-shrink-0 rounded"
                  style={{
                    width: '22px',
                    height: '22px',
                    background: n.source === 'writing' ? 'rgba(184,134,11,0.12)' : 'rgba(139,69,19,0.1)',
                    color: n.source === 'writing' ? 'var(--nb-gold-dark, #8B6914)' : 'var(--nb-accent, #8B4513)',
                  }}
                >
                  {n.source === 'writing' ? <PenTool size={11} /> : <Lock size={11} />}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ height: `${LINE_H * 2}px` }}>
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--nb-ink, #3a2518)', fontFamily: NOTEBOOK_FONT_FAMILY_CSS_VAR, lineHeight: `${LINE_H}px` }}>
                    {n.title}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--nb-muted, #8B7355)', lineHeight: `${LINE_H * 0.8}px` }}>
                    {n.source === 'writing' ? 'Escrito privado' : 'Nota personal'} ·{' '}
                    {new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
        <span className="text-[10px]" style={{ color: '#b8a070', fontFamily: NOTEBOOK_FONT_FAMILY_CSS_VAR }}>— privado —</span>
      </div>
    </div>
  )
}

