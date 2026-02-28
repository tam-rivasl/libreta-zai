'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Save, X, Lock, Users } from 'lucide-react'
import { LINE_H } from '@/components/notebook-interior'
import { NOTEBOOK_FONT_FAMILY_CSS_VAR } from '@/lib/notebook-style'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { confirmDeleteToast } from '@/lib/confirm-toast'
import {
  hasMeaningfulRichText,
  normalizeRichTextContent,
  sanitizeRichTextHtml,
} from '@/lib/rich-text'

interface Writing {
  id: string
  title: string
  content: string
  is_shared: boolean
  created_at: string
  user_id: string
}

interface WritingPageProps {
  userId: string
}

const SERIF = { fontFamily: NOTEBOOK_FONT_FAMILY_CSS_VAR }
const PAGE_FRAME_STYLE = {
  paddingLeft: 'clamp(14px, 7vw, 52px)',
  paddingRight: 'clamp(14px, 7vw, 52px)',
}

export function WritingPage({ userId }: WritingPageProps) {
  const [writings, setWritings] = useState<Writing[]>([])
  const [loading, setLoading] = useState(true)
  const [pageIndex, setPageIndex] = useState(0) // 0 = index list, 1..n = actual writings
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editShared, setEditShared] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newShared, setNewShared] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadWritings() }, [])

  const loadWritings = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('writings')
      .select('*')
      .or(`user_id.eq.${userId},is_shared.eq.true`)
      .order('created_at', { ascending: false })
    setWritings(data || [])
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!newTitle.trim() || !hasMeaningfulRichText(newContent)) return
    const { data, error } = await supabase
      .from('writings')
      .insert([{ user_id: userId, title: newTitle, content: newContent, is_shared: newShared }])
      .select()
    if (!error && data) {
      const updated = [data[0], ...writings]
      setWritings(updated)
      setIsCreating(false)
      setNewTitle(''); setNewContent(''); setNewShared(true)
      setPageIndex(1)
    }
  }

  const handleSaveEdit = async () => {
    const w = writings[pageIndex - 1]
    if (!w || !editTitle.trim() || !hasMeaningfulRichText(editContent)) return
    const { error } = await supabase
      .from('writings')
      .update({ title: editTitle, content: editContent, is_shared: editShared })
      .eq('id', w.id)
    if (!error) {
      setWritings(writings.map(x => x.id === w.id ? { ...x, title: editTitle, content: editContent, is_shared: editShared } : x))
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    const w = writings[pageIndex - 1]
    if (!w) return

    confirmDeleteToast({
      itemLabel: 'este escrito',
      onConfirm: async () => {
        await supabase.from('writings').delete().eq('id', w.id)
        setWritings((prev) => prev.filter((x) => x.id !== w.id))
        setPageIndex((prev) => Math.max(0, prev - 1))
      },
    })
  }

  const startEdit = () => {
    const w = writings[pageIndex - 1]
    if (!w) return
    setEditTitle(w.title); setEditContent(w.content); setEditShared(w.is_shared)
    setIsEditing(true)
  }

  // If creating a new entry — show a full-page form
  if (isCreating) {
    return (
      <div className="absolute inset-0 flex flex-col p-3 pt-10 sm:p-5 sm:pt-5" style={{ ...SERIF, ...PAGE_FRAME_STYLE }}>
        <div className="flex items-center justify-between" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--nb-ink, #3a2518)' }}>Nueva página</h3>
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
            placeholder="Escribe aquí..."
            lineHeight={LINE_H}
          />
        </div>

        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--nb-line, #d4c5a9)' }}>
          {/* Privacy toggle */}
          <button
            onClick={() => setNewShared(s => !s)}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full transition-all"
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
            onClick={handleCreate}
            disabled={!newTitle.trim() || !hasMeaningfulRichText(newContent)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium disabled:opacity-40 transition-all"
            style={{ background: 'var(--nb-accent, #8B4513)', color: '#f5ecd8' }}
          >
            <Save size={14} /> Guardar
          </button>
        </div>
      </div>
    )
  }

  // Show current writing with full-page view
  const current = writings[pageIndex - 1]
  const isOwner = current?.user_id === userId

  if (isEditing && current) {
    return (
      <div className="absolute inset-0 flex flex-col p-3 pt-10 sm:p-5 sm:pt-5" style={{ ...SERIF, ...PAGE_FRAME_STYLE }}>
        <div className="flex items-center justify-between" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--nb-ink, #3a2518)' }}>Editar</h3>
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

        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--nb-line, #d4c5a9)' }}>
          <button
            onClick={() => setEditShared(s => !s)}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full transition-all"
            style={{
              background: editShared ? 'rgba(184,134,11,0.15)' : 'rgba(139,69,19,0.1)',
              color: editShared ? 'var(--nb-gold-dark, #8B6914)' : 'var(--nb-accent, #8B4513)',
              border: `1px solid ${editShared ? 'var(--nb-gold, #B8860B)' : 'var(--nb-accent, #8B4513)'}`,
            }}
          >
            {editShared ? <Users size={12} /> : <Lock size={12} />}
            {editShared ? 'Compartido' : 'Privado'}
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

  // ── PAGE 0: Index / list of writings ──
  if (pageIndex === 0) {
    return (
      <div className="absolute inset-0 flex flex-col p-3 pt-10 sm:p-5 sm:pt-5" style={PAGE_FRAME_STYLE}>
        {/* Header — aligned to first line */}
        <div className="flex items-center justify-between" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--nb-ink, #3a2518)', ...SERIF }}>
            Escritos
          </h2>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded transition-all active:opacity-70"
            style={{ background: 'var(--nb-accent, #8B4513)', color: '#f5ecd8' }}
          >
            <Plus size={12} />Añadir
          </button>
        </div>

        {/* Subtitle — on line 2 */}
        <p className="text-[10px]" style={{ color: 'var(--nb-muted, #8B7355)', height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
          {writings.length} {writings.length === 1 ? 'escrito' : 'escritos'}
        </p>

        {/* List — each row sits on 2 lines */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs" style={{ color: 'var(--nb-muted, #8B7355)', ...SERIF }}>Cargando...</p>
            </div>
          ) : writings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <p className="text-sm text-center" style={{ color: 'var(--nb-muted, #8B7355)', ...SERIF }}>
                Sin escritos. ¡Crea el primero!
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {writings.map((w, i) => (
                <button
                  key={w.id}
                  onClick={() => setPageIndex(i + 1)}
                  className="flex items-center gap-3 text-left transition-all active:opacity-60"
                  style={{ height: `${LINE_H * 2}px`, borderBottom: '1px solid rgba(180,150,100,0.15)' }}
                >
                  <span className="text-[11px] flex-shrink-0 w-5 text-right" style={{ color: '#b8a070', fontFamily: NOTEBOOK_FONT_FAMILY_CSS_VAR }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ height: `${LINE_H * 2}px` }}>
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--nb-ink, #3a2518)', fontFamily: NOTEBOOK_FONT_FAMILY_CSS_VAR, lineHeight: `${LINE_H}px` }}>
                      {w.title}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--nb-muted, #8B7355)', lineHeight: `${LINE_H * 0.8}px` }}>
                      {new Date(w.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span
                    className="text-[9px] px-1.5 rounded-full flex-shrink-0"
                    style={{
                      background: w.is_shared ? 'rgba(184,134,11,0.14)' : 'rgba(139,69,19,0.1)',
                      color: w.is_shared ? 'var(--nb-gold-dark, #8B6914)' : 'var(--nb-accent, #8B4513)',
                      lineHeight: '18px',
                    }}
                  >
                    {w.is_shared ? 'compartido' : 'privado'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-center" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
          <span className="text-[10px]" style={{ color: '#b8a070', fontFamily: NOTEBOOK_FONT_FAMILY_CSS_VAR }}>— índice —</span>
        </div>
      </div>
    )
  }

  // ── PAGES 1..n: Single writing view ──
  return (
    <div className="absolute inset-0 flex flex-col p-3 pt-10 sm:p-5 sm:pt-5" style={PAGE_FRAME_STYLE}>
      {/* Navigation bar */}
      <div className="flex items-center justify-between" style={{ height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
        <button
          onClick={() => setPageIndex(0)}
          className="flex items-center gap-1 text-[11px] transition-opacity hover:opacity-70"
          style={{ color: 'var(--nb-accent, #8B4513)' }}
        >
          <ChevronLeft size={14} /> Índice
        </button>

        {isOwner && (
          <div className="flex gap-2">
            <button
              onClick={startEdit}
              className="flex items-center gap-1 text-[11px] transition-opacity hover:opacity-70"
              style={{ color: '#6b5744' }}
            >
              <Edit2 size={12} /> Editar
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 text-[11px] transition-opacity hover:opacity-70"
              style={{ color: '#9b4040' }}
            >
              <Trash2 size={12} /> Eliminar
            </button>
          </div>
        )}
      </div>

      {/* Writing content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <h3
          className="text-base font-semibold"
          style={{ color: 'var(--nb-ink, #3a2518)', ...SERIF, height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}
        >
          {current.title}
        </h3>
        <p className="text-[10px]" style={{ color: '#a08c70', height: `${LINE_H}px`, lineHeight: `${LINE_H}px` }}>
          {new Date(current.created_at).toLocaleDateString('es-ES', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
          })}
          {' · '}
          <span style={{ color: current.is_shared ? 'var(--nb-gold-dark, #8B6914)' : 'var(--nb-accent, #8B4513)' }}>
            {current.is_shared ? 'compartido' : 'privado'}
          </span>
        </p>

        {/* Body text — fills remaining space, perfectly aligned */}
        <div className="flex-1 overflow-hidden">
          <div
            className="h-full overflow-y-auto text-sm [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
            style={{ color: 'var(--nb-ink, #3a2518)', ...SERIF, lineHeight: `${LINE_H}px` }}
            dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(normalizeRichTextContent(current.content)) }}
          />
        </div>
      </div>

      {/* Bottom navigation arrows */}
      <div
        className="flex items-center justify-between pt-2"
        style={{ borderTop: '1px solid rgba(180,150,100,0.3)', height: `${LINE_H}px` }}
      >
        <button
          onClick={() => setPageIndex(pi => Math.max(1, pi - 1))}
          disabled={pageIndex <= 1}
          className="flex items-center gap-1 text-[11px] disabled:opacity-30 transition-opacity hover:opacity-70"
          style={{ color: 'var(--nb-accent, #8B4513)' }}
        >
          <ChevronLeft size={14} /> Anterior
        </button>

        <span className="text-[10px]" style={{ color: '#b8a070', fontFamily: NOTEBOOK_FONT_FAMILY_CSS_VAR }}>
          {pageIndex} / {writings.length}
        </span>

        <button
          onClick={() => setPageIndex(pi => Math.min(writings.length, pi + 1))}
          disabled={pageIndex >= writings.length}
          className="flex items-center gap-1 text-[11px] disabled:opacity-30 transition-opacity hover:opacity-70"
          style={{ color: 'var(--nb-accent, #8B4513)' }}
        >
          Siguiente <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

