'use client'

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ClipboardPaste,
  Copy,
  Eraser,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Palette,
  Paintbrush,
  Quote,
  Redo2,
  Scissors,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  Undo2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import {
  hasMeaningfulRichText,
  normalizeRichTextContent,
  sanitizeRichTextHtml,
} from '@/lib/rich-text'
import { NOTEBOOK_FONT_FAMILY_CSS_VAR } from '@/lib/notebook-style'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  lineHeight?: number
  className?: string
  disabled?: boolean
}

type BlockType = 'p' | 'h1' | 'h2' | 'h3' | 'blockquote'
type LineSpacingValue = '1' | '1.15' | '1.5' | '2'

interface ToolbarToggles {
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  subscript: boolean
  superscript: boolean
  unorderedList: boolean
  orderedList: boolean
  alignLeft: boolean
  alignCenter: boolean
  alignRight: boolean
  alignJustify: boolean
}

interface FormatSnapshot {
  fontFamily: string
  fontSize: number
  textColor: string
  highlightColor: string
  isBold: boolean
  isItalic: boolean
  isUnderline: boolean
  isStrike: boolean
  isSubscript: boolean
  isSuperscript: boolean
}

const blockOptions: Array<{ id: BlockType; label: string }> = [
  { id: 'p', label: 'Normal' },
  { id: 'h1', label: 'Título 1' },
  { id: 'h2', label: 'Título 2' },
  { id: 'h3', label: 'Título 3' },
  { id: 'blockquote', label: 'Cita' },
]

const fontOptions = [
  'Lora',
  'Playfair Display',
  'Roboto',
  'Century Gothic',
  'Arial',
  'Verdana',
  'Georgia',
  'Times New Roman',
  'Garamond',
  'Palatino Linotype',
  'Courier New',
]

const fontSizeOptions = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32]
const lineSpacingOptions: Array<{ value: LineSpacingValue; label: string }> = [
  { value: '1', label: '1.0' },
  { value: '1.15', label: '1.15' },
  { value: '1.5', label: '1.5' },
  { value: '2', label: '2.0' },
]

function execSizeFromPx(size: number) {
  if (size <= 10) return '1'
  if (size <= 13) return '2'
  if (size <= 16) return '3'
  if (size <= 18) return '4'
  if (size <= 24) return '5'
  if (size <= 32) return '6'
  return '7'
}

function pxFromExecSize(value: string) {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return 14
  const pxMap: Record<number, number> = {
    1: 10,
    2: 13,
    3: 16,
    4: 18,
    5: 24,
    6: 32,
    7: 48,
  }
  return pxMap[parsed] ?? 14
}

function normalizeFontName(raw: string) {
  return raw.replace(/^['"]|['"]$/g, '').trim()
}

function normalizeToHexColor(input: string) {
  if (!input) return '#000000'

  const style = new Option().style
  style.color = input
  const normalized = style.color
  if (!normalized) return '#000000'

  if (normalized.startsWith('#')) {
    if (normalized.length === 4) {
      const [, r, g, b] = normalized
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
    }
    return normalized.toLowerCase()
  }

  const match = normalized.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/i)
  if (!match) return '#000000'

  const [r, g, b] = match.slice(1, 4).map((part) => Number(part))
  return `#${[r, g, b]
    .map((num) => num.toString(16).padStart(2, '0'))
    .join('')}`.toLowerCase()
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe aquí...',
  lineHeight = 26,
  className,
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const lastSelectionRangeRef = useRef<Range | null>(null)
  const [currentBlock, setCurrentBlock] = useState<BlockType>('p')
  const [isEmpty, setIsEmpty] = useState(!hasMeaningfulRichText(value))
  const [selectedFont, setSelectedFont] = useState('Lora')
  const [selectedSize, setSelectedSize] = useState(14)
  const [textColor, setTextColor] = useState('var(--nb-ink, #3a2518)')
  const [highlightColor, setHighlightColor] = useState('#fff7d6')
  const [lineSpacing, setLineSpacing] = useState<LineSpacingValue>('1.5')
  const [formatPainter, setFormatPainter] = useState<FormatSnapshot | null>(null)
  const [toggles, setToggles] = useState<ToolbarToggles>({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    subscript: false,
    superscript: false,
    unorderedList: false,
    orderedList: false,
    alignLeft: false,
    alignCenter: false,
    alignRight: false,
    alignJustify: false,
  })

  const normalizedValue = useMemo(() => normalizeRichTextContent(value), [value])
  const toolbarControlHeight = Math.max(28, lineHeight + 4)
  const toolbarRowHeight = Math.max(38, lineHeight + 12)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (editor.innerHTML === normalizedValue) return
    editor.innerHTML = normalizedValue
    setIsEmpty(!hasMeaningfulRichText(normalizedValue))
  }, [normalizedValue])

  const emitCurrentHtml = () => {
    const editor = editorRef.current
    if (!editor) return
    const cleaned = sanitizeRichTextHtml(editor.innerHTML)
    if (cleaned !== editor.innerHTML) {
      editor.innerHTML = cleaned
    }
    setIsEmpty(!hasMeaningfulRichText(cleaned))
    onChange(cleaned)
  }

  const captureSelectionRange = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const container = range.commonAncestorContainer
    if (!editor.contains(container)) return
    lastSelectionRangeRef.current = range.cloneRange()
  }

  const restoreSelectionRange = () => {
    const selection = window.getSelection()
    const range = lastSelectionRangeRef.current
    if (!selection || !range) return

    try {
      selection.removeAllRanges()
      selection.addRange(range)
    } catch {
      // Ignore stale ranges if DOM changed after sanitization.
    }
  }

  const focusEditor = () => {
    editorRef.current?.focus()
  }

  const runCommand = (command: string, valueArg?: string) => {
    if (disabled) return
    focusEditor()
    restoreSelectionRange()
    document.execCommand(command, false, valueArg)
    emitCurrentHtml()
    captureSelectionRange()
    refreshToolbarState()
  }

  const applyBlock = (block: BlockType) => {
    const htmlTag = block === 'p' ? '<p>' : `<${block}>`
    setCurrentBlock(block)
    runCommand('formatBlock', htmlTag)
  }

  const applyFontName = (font: string) => {
    setSelectedFont(font)
    runCommand('fontName', font)
  }

  const applyFontSize = (size: number) => {
    setSelectedSize(size)
    runCommand('fontSize', execSizeFromPx(size))
  }

  const increaseFontSize = () => {
    const currentIndex = fontSizeOptions.indexOf(selectedSize)
    const nextSize = currentIndex >= 0
      ? fontSizeOptions[Math.min(fontSizeOptions.length - 1, currentIndex + 1)]
      : Math.min(selectedSize + 2, 48)
    applyFontSize(nextSize)
  }

  const decreaseFontSize = () => {
    const currentIndex = fontSizeOptions.indexOf(selectedSize)
    const nextSize = currentIndex >= 0
      ? fontSizeOptions[Math.max(0, currentIndex - 1)]
      : Math.max(selectedSize - 2, 10)
    applyFontSize(nextSize)
  }

  const applyTextColor = (color: string) => {
    setTextColor(color)
    runCommand('foreColor', color)
  }

  const applyHighlightColor = (color: string) => {
    setHighlightColor(color)
    runCommand('hiliteColor', color)
  }

  const applyStyleToSelectedBlocks = (property: string, valueToApply: string) => {
    const editor = editorRef.current
    if (!editor || disabled) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const blocks = editor.querySelectorAll<HTMLElement>('p,div,li,blockquote,h1,h2,h3')
    let touchedAny = false

    blocks.forEach((block) => {
      if (!range.intersectsNode(block)) return
      block.style.setProperty(property, valueToApply)
      touchedAny = true
    })

    if (!touchedAny) {
      const anchorElement =
        selection.anchorNode?.nodeType === Node.ELEMENT_NODE
          ? (selection.anchorNode as HTMLElement)
          : selection.anchorNode?.parentElement
      const nearestBlock = anchorElement?.closest('p,div,li,blockquote,h1,h2,h3') as HTMLElement | null
      if (nearestBlock && editor.contains(nearestBlock)) {
        nearestBlock.style.setProperty(property, valueToApply)
        touchedAny = true
      }
    }

    if (touchedAny) {
      emitCurrentHtml()
      refreshToolbarState()
    }
  }

  const applyLineSpacing = (valueToApply: LineSpacingValue) => {
    setLineSpacing(valueToApply)
    applyStyleToSelectedBlocks('line-height', valueToApply)
  }

  const readSelectionSnapshot = (): FormatSnapshot | null => {
    const selection = window.getSelection()
    const editor = editorRef.current
    if (!selection || selection.rangeCount === 0 || !editor) return null

    const anchor =
      selection.anchorNode?.nodeType === Node.ELEMENT_NODE
        ? (selection.anchorNode as HTMLElement)
        : selection.anchorNode?.parentElement
    if (!anchor || !editor.contains(anchor)) return null

    const computed = window.getComputedStyle(anchor)

    return {
      fontFamily: normalizeFontName(computed.fontFamily.split(',')[0] ?? selectedFont),
      fontSize: Math.round(Number.parseFloat(computed.fontSize) || selectedSize),
      textColor: normalizeToHexColor(computed.color),
      highlightColor: normalizeToHexColor(computed.backgroundColor),
      isBold: document.queryCommandState('bold'),
      isItalic: document.queryCommandState('italic'),
      isUnderline: document.queryCommandState('underline'),
      isStrike: document.queryCommandState('strikeThrough'),
      isSubscript: document.queryCommandState('subscript'),
      isSuperscript: document.queryCommandState('superscript'),
    }
  }

  const enableFormatPainter = () => {
    const snapshot = readSelectionSnapshot()
    if (!snapshot) return
    setFormatPainter(snapshot)
  }

  const applyFormatPainter = () => {
    if (!formatPainter || disabled) return
    focusEditor()

    document.execCommand('fontName', false, formatPainter.fontFamily)
    document.execCommand('fontSize', false, execSizeFromPx(formatPainter.fontSize))
    document.execCommand('foreColor', false, formatPainter.textColor)
    document.execCommand('hiliteColor', false, formatPainter.highlightColor)

    if (document.queryCommandState('bold') !== formatPainter.isBold) {
      document.execCommand('bold')
    }
    if (document.queryCommandState('italic') !== formatPainter.isItalic) {
      document.execCommand('italic')
    }
    if (document.queryCommandState('underline') !== formatPainter.isUnderline) {
      document.execCommand('underline')
    }
    if (document.queryCommandState('strikeThrough') !== formatPainter.isStrike) {
      document.execCommand('strikeThrough')
    }
    if (document.queryCommandState('subscript') !== formatPainter.isSubscript) {
      document.execCommand('subscript')
    }
    if (document.queryCommandState('superscript') !== formatPainter.isSuperscript) {
      document.execCommand('superscript')
    }

    setFormatPainter(null)
    emitCurrentHtml()
    refreshToolbarState()
  }

  const pasteFromClipboard = async () => {
    if (disabled) return
    focusEditor()

    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText()
        document.execCommand('insertText', false, text)
      } else {
        document.execCommand('paste')
      }
    } catch {
      document.execCommand('paste')
    }

    emitCurrentHtml()
    refreshToolbarState()
  }

  const refreshToolbarState = () => {
    const block = document.queryCommandValue('formatBlock')
    if (typeof block === 'string' && block.length > 0) {
      const normalized = block.replace(/[<>]/g, '').toLowerCase()
      if (blockOptions.some((option) => option.id === normalized)) {
        setCurrentBlock(normalized as BlockType)
      }
    }

    const fontName = document.queryCommandValue('fontName')
    if (typeof fontName === 'string' && fontName.length > 0) {
      setSelectedFont(normalizeFontName(fontName.split(',')[0] ?? fontName))
    }

    const fontSize = document.queryCommandValue('fontSize')
    if (typeof fontSize === 'string' && fontSize.length > 0) {
      setSelectedSize(pxFromExecSize(fontSize))
    }

    const currentColor = document.queryCommandValue('foreColor')
    if (typeof currentColor === 'string' && currentColor.length > 0) {
      setTextColor(normalizeToHexColor(currentColor))
    }

    const currentHighlight = document.queryCommandValue('hiliteColor')
    if (typeof currentHighlight === 'string' && currentHighlight.length > 0) {
      setHighlightColor(normalizeToHexColor(currentHighlight))
    }

    setToggles({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strike: document.queryCommandState('strikeThrough'),
      subscript: document.queryCommandState('subscript'),
      superscript: document.queryCommandState('superscript'),
      unorderedList: document.queryCommandState('insertUnorderedList'),
      orderedList: document.queryCommandState('insertOrderedList'),
      alignLeft: document.queryCommandState('justifyLeft'),
      alignCenter: document.queryCommandState('justifyCenter'),
      alignRight: document.queryCommandState('justifyRight'),
      alignJustify: document.queryCommandState('justifyFull'),
    })
  }

  useEffect(() => {
    const onSelectionChange = () => {
      const editor = editorRef.current
      if (!editor) return
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return
      const anchorNode = selection.anchorNode
      if (!anchorNode) return
      if (!editor.contains(anchorNode)) return
      captureSelectionRange()
      refreshToolbarState()
    }

    document.addEventListener('selectionchange', onSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange)
    }
  }, [])

  return (
    <div
      className={cn(
        'flex h-full min-h-0 min-w-0 flex-col rounded border',
        className,
      )}
      style={{ borderColor: 'var(--nb-line, #d4c5a9)', background: 'rgba(245,236,216,0.22)' }}
    >
      <div
        className="flex flex-col gap-1.5 px-2.5 py-1.5"
        style={{
          borderBottom: '1px solid var(--nb-line, #d4c5a9)',
          fontFamily: NOTEBOOK_FONT_FAMILY_CSS_VAR,
        }}
      >
        <div
          className="w-full"
          style={{ minHeight: `${lineHeight}px` }}
        >
          <div
            className="notebook-scroll w-full overflow-x-auto overflow-y-hidden pb-1"
            style={{
              height: `${toolbarRowHeight}px`,
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-x',
            }}
          >
            <div className="flex w-max items-center gap-1.5 px-0.5 pr-3">
              <ToolbarButton icon={Undo2} onClick={() => runCommand('undo')} title="Deshacer" disabled={disabled} />
              <ToolbarButton icon={Redo2} onClick={() => runCommand('redo')} title="Rehacer" disabled={disabled} />
              <ToolbarSeparator />
              <ToolbarButton icon={ClipboardPaste} onClick={pasteFromClipboard} title="Pegar" disabled={disabled} />
              <ToolbarButton icon={Copy} onClick={() => runCommand('copy')} title="Copiar" disabled={disabled} />
              <ToolbarButton icon={Scissors} onClick={() => runCommand('cut')} title="Cortar" disabled={disabled} />
              <ToolbarButton
                icon={Paintbrush}
                onClick={enableFormatPainter}
                title={formatPainter ? 'Formato copiado' : 'Copiar formato'}
                disabled={disabled}
                active={Boolean(formatPainter)}
              />
              <ToolbarSeparator />

              <select
                aria-label="Tipo de párrafo"
                value={currentBlock}
                onChange={(event) => applyBlock(event.target.value as BlockType)}
                disabled={disabled}
                className="rounded border bg-transparent px-2 text-[11px] outline-none"
                style={{
                  height: `${toolbarControlHeight}px`,
                  borderColor: 'var(--nb-border, #c4a87a)',
                  color: 'var(--nb-ink, #3a2518)',
                  minWidth: '90px',
                }}
              >
                {blockOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Fuente"
                value={selectedFont}
                onChange={(event) => applyFontName(event.target.value)}
                disabled={disabled}
                className="rounded border bg-transparent px-2 text-[11px] outline-none"
                style={{
                  height: `${toolbarControlHeight}px`,
                  borderColor: 'var(--nb-border, #c4a87a)',
                  color: 'var(--nb-ink, #3a2518)',
                  minWidth: '118px',
                }}
              >
                {fontOptions.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>

              <select
                aria-label="Tamaño de fuente"
                value={String(selectedSize)}
                onChange={(event) => applyFontSize(Number(event.target.value))}
                disabled={disabled}
                className="rounded border bg-transparent px-2 text-[11px] outline-none"
                style={{
                  height: `${toolbarControlHeight}px`,
                  borderColor: 'var(--nb-border, #c4a87a)',
                  color: 'var(--nb-ink, #3a2518)',
                  minWidth: '58px',
                }}
              >
                {fontSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>

              <ToolbarTextButton label="A+" onClick={increaseFontSize} title="Aumentar tamaño" disabled={disabled} />
              <ToolbarTextButton label="A-" onClick={decreaseFontSize} title="Disminuir tamaño" disabled={disabled} />
            </div>
          </div>
        </div>

        <div
          className="w-full"
          style={{ minHeight: `${lineHeight}px` }}
        >
          <div
            className="notebook-scroll w-full overflow-x-auto overflow-y-hidden pb-1"
            style={{
              height: `${toolbarRowHeight}px`,
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-x',
            }}
          >
            <div className="flex w-max items-center gap-1.5 px-0.5 pr-3">
              <ToolbarButton
                icon={Bold}
                onClick={() => runCommand('bold')}
                title="Negrita"
                disabled={disabled}
                active={toggles.bold}
              />
              <ToolbarButton
                icon={Italic}
                onClick={() => runCommand('italic')}
                title="Cursiva"
                disabled={disabled}
                active={toggles.italic}
              />
              <ToolbarButton
                icon={Underline}
                onClick={() => runCommand('underline')}
                title="Subrayado"
                disabled={disabled}
                active={toggles.underline}
              />
              <ToolbarButton
                icon={Strikethrough}
                onClick={() => runCommand('strikeThrough')}
                title="Tachado"
                disabled={disabled}
                active={toggles.strike}
              />
              <ToolbarButton
                icon={Subscript}
                onClick={() => runCommand('subscript')}
                title="Subíndice"
                disabled={disabled}
                active={toggles.subscript}
              />
              <ToolbarButton
                icon={Superscript}
                onClick={() => runCommand('superscript')}
                title="Superíndice"
                disabled={disabled}
                active={toggles.superscript}
              />
              <ToolbarButton icon={Eraser} onClick={() => runCommand('removeFormat')} title="Limpiar formato" disabled={disabled} />

              <label className="ml-1.5 inline-flex items-center gap-1.5 text-[10px]" style={{ color: '#6b5744' }}>
                <Palette size={11} />
                <input
                  type="color"
                  value={textColor}
                  onChange={(event) => applyTextColor(event.target.value)}
                  onMouseDown={captureSelectionRange}
                  disabled={disabled}
                  className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                  title="Color de texto"
                />
              </label>

              <label className="inline-flex items-center gap-1.5 text-[10px]" style={{ color: '#6b5744' }}>
                <Highlighter size={11} />
                <input
                  type="color"
                  value={highlightColor}
                  onChange={(event) => applyHighlightColor(event.target.value)}
                  onMouseDown={captureSelectionRange}
                  disabled={disabled}
                  className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                  title="Resaltado"
                />
              </label>

              <ToolbarSeparator />
              <ToolbarButton
                icon={AlignLeft}
                onClick={() => runCommand('justifyLeft')}
                title="Alinear izquierda"
                disabled={disabled}
                active={toggles.alignLeft}
              />
              <ToolbarButton
                icon={AlignCenter}
                onClick={() => runCommand('justifyCenter')}
                title="Centrar"
                disabled={disabled}
                active={toggles.alignCenter}
              />
              <ToolbarButton
                icon={AlignRight}
                onClick={() => runCommand('justifyRight')}
                title="Alinear derecha"
                disabled={disabled}
                active={toggles.alignRight}
              />
              <ToolbarButton
                icon={AlignJustify}
                onClick={() => runCommand('justifyFull')}
                title="Justificar"
                disabled={disabled}
                active={toggles.alignJustify}
              />
              <ToolbarButton
                icon={List}
                onClick={() => runCommand('insertUnorderedList')}
                title="Viñetas"
                disabled={disabled}
                active={toggles.unorderedList}
              />
              <ToolbarButton
                icon={ListOrdered}
                onClick={() => runCommand('insertOrderedList')}
                title="Numeración"
                disabled={disabled}
                active={toggles.orderedList}
              />
              <ToolbarButton icon={IndentIncrease} onClick={() => runCommand('indent')} title="Sangría +" disabled={disabled} />
              <ToolbarButton icon={IndentDecrease} onClick={() => runCommand('outdent')} title="Sangría -" disabled={disabled} />
              <ToolbarButton
                icon={Quote}
                onClick={() => applyBlock('blockquote')}
                title="Cita"
                disabled={disabled}
                active={currentBlock === 'blockquote'}
              />

              <select
                aria-label="Interlineado"
                value={lineSpacing}
                onChange={(event) => applyLineSpacing(event.target.value as LineSpacingValue)}
                disabled={disabled}
                className="rounded border bg-transparent px-2 text-[11px] outline-none"
                style={{
                  height: `${toolbarControlHeight}px`,
                  borderColor: 'var(--nb-border, #c4a87a)',
                  color: 'var(--nb-ink, #3a2518)',
                  minWidth: '62px',
                }}
              >
                {lineSpacingOptions.map((spacing) => (
                  <option key={spacing.value} value={spacing.value}>
                    {spacing.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

      </div>

      <div className="relative flex-1 min-h-0">
        {isEmpty && (
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 px-2 text-xs"
            style={{
              color: 'var(--nb-muted, #8B7355)',
              lineHeight: `${lineHeight}px`,
              fontFamily: NOTEBOOK_FONT_FAMILY_CSS_VAR,
            }}
          >
            {placeholder}
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable={!disabled}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          suppressContentEditableWarning
          onInput={emitCurrentHtml}
          onBlur={emitCurrentHtml}
          onFocus={() => {
            captureSelectionRange()
            refreshToolbarState()
          }}
          onMouseUp={() => {
            if (formatPainter) applyFormatPainter()
            captureSelectionRange()
            refreshToolbarState()
          }}
          onKeyUp={() => {
            captureSelectionRange()
            refreshToolbarState()
          }}
          className={cn(
            'h-full min-h-0 overflow-y-auto px-2 py-0 text-sm outline-none',
            '[&_h1]:text-lg [&_h1]:font-semibold',
            '[&_h2]:text-base [&_h2]:font-semibold',
            '[&_h3]:text-sm [&_h3]:font-semibold',
            '[&_ul]:list-disc [&_ul]:pl-5',
            '[&_ol]:list-decimal [&_ol]:pl-5',
            '[&_blockquote]:border-l-2 [&_blockquote]:pl-3',
          )}
          style={{
            color: 'var(--nb-ink, #3a2518)',
            lineHeight: `${lineHeight}px`,
            fontFamily: NOTEBOOK_FONT_FAMILY_CSS_VAR,
          }}
        />
      </div>
    </div>
  )
}

function ToolbarButton({
  icon: Icon,
  onClick,
  title,
  disabled,
  active = false,
}: {
  icon: ComponentType<{ size?: number }>
  onClick: () => void
  title: string
  disabled: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded border shadow-[0_0_0_1px_rgba(139,69,19,0.05)] transition-colors hover:bg-amber-50 disabled:opacity-40"
      style={{
        width: 'clamp(24px, 7.2vw, 30px)',
        height: 'clamp(24px, 7.2vw, 30px)',
        color: active ? '#f5ecd8' : '#6b5744',
        background: active ? 'var(--nb-accent, #8B4513)' : 'transparent',
        borderColor: active ? 'var(--nb-accent, #8B4513)' : 'rgba(139,69,19,0.25)',
      }}
    >
      <Icon size={14} />
    </button>
  )
}

function ToolbarTextButton({
  label,
  onClick,
  title,
  disabled,
}: {
  label: string
  onClick: () => void
  title: string
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded border px-1.5 text-[11px] transition-colors hover:bg-amber-50 disabled:opacity-40"
      style={{
        height: 'clamp(24px, 7.2vw, 30px)',
        color: '#6b5744',
        borderColor: 'rgba(139,69,19,0.25)',
      }}
    >
      {label}
    </button>
  )
}

function ToolbarSeparator() {
  return (
    <Separator
      orientation="vertical"
      className="mx-2 h-5 shrink-0"
      style={{ background: 'rgba(139,69,19,0.25)' }}
    />
  )
}

