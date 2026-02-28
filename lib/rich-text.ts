const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'span',
  'div',
  'ul',
  'ol',
  'li',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'sub',
  'sup',
  'font',
])

const SAFE_TEXT_ALIGN = new Set(['left', 'right', 'center', 'justify'])
const SAFE_VERTICAL_ALIGN = new Set(['baseline', 'sub', 'super'])
const SAFE_FONT_STYLE = new Set(['normal', 'italic', 'oblique'])
const SAFE_TEXT_DECORATION = new Set([
  'none',
  'underline',
  'line-through',
  'underline line-through',
  'line-through underline',
])

const CSS_COLOR_RE =
  /^(#[0-9a-f]{3,8}|rgb(a)?\([^)]+\)|hsl(a)?\([^)]+\)|[a-z]+)$/i
const CSS_FONT_FAMILY_RE = /^[a-z0-9,\s"'-.]+$/i
const CSS_SIZE_RE = /^-?\d+(\.\d+)?(px|em|rem|%)$/i
const CSS_LINE_HEIGHT_RE = /^(\d+(\.\d+)?(px|em|rem|%)?|normal)$/i

function mapLegacyFontSizeToPx(size: string) {
  const parsed = Number(size)
  if (Number.isNaN(parsed)) return ''
  const pxMap: Record<number, string> = {
    1: '10px',
    2: '13px',
    3: '16px',
    4: '18px',
    5: '24px',
    6: '32px',
    7: '48px',
  }
  return pxMap[parsed] ?? ''
}

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function normalizeRichTextContent(value: string) {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return '<p><br></p>'
  if (HTML_TAG_RE.test(trimmed)) return trimmed
  return `<p>${escapeHtml(trimmed).replaceAll('\n', '<br>')}</p>`
}

export function plainTextFromRichHtml(input: string) {
  const normalized = normalizeRichTextContent(input)

  if (typeof window === 'undefined') {
    return normalized
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim()
  }

  const doc = new DOMParser().parseFromString(normalized, 'text/html')
  return (doc.body.textContent ?? '').trim()
}

export function hasMeaningfulRichText(input: string) {
  return plainTextFromRichHtml(input).length > 0
}

function sanitizeStyleAttribute(styleText: string) {
  const safe: string[] = []

  styleText
    .split(';')
    .map((rule) => rule.trim())
    .filter(Boolean)
    .forEach((rule) => {
      const [rawProp, rawValue] = rule.split(':')
      const prop = rawProp?.trim().toLowerCase()
      const value = rawValue?.trim().toLowerCase()

      if (!prop || !value) return
      if (prop === 'text-align' && SAFE_TEXT_ALIGN.has(value)) {
        safe.push(`text-align: ${value}`)
        return
      }

      if (prop === 'font-family' && CSS_FONT_FAMILY_RE.test(value)) {
        safe.push(`font-family: ${value}`)
        return
      }

      if (prop === 'font-size' && CSS_SIZE_RE.test(value)) {
        safe.push(`font-size: ${value}`)
        return
      }

      if (prop === 'line-height' && CSS_LINE_HEIGHT_RE.test(value)) {
        safe.push(`line-height: ${value}`)
        return
      }

      if ((prop === 'color' || prop === 'background-color') && CSS_COLOR_RE.test(value)) {
        safe.push(`${prop}: ${value}`)
        return
      }

      if (prop === 'font-style' && SAFE_FONT_STYLE.has(value)) {
        safe.push(`font-style: ${value}`)
        return
      }

      if (prop === 'font-weight' && /^(normal|bold|bolder|lighter|[1-9]00)$/.test(value)) {
        safe.push(`font-weight: ${value}`)
        return
      }

      if (prop === 'text-decoration' && SAFE_TEXT_DECORATION.has(value)) {
        safe.push(`text-decoration: ${value}`)
        return
      }

      if (prop === 'vertical-align' && SAFE_VERTICAL_ALIGN.has(value)) {
        safe.push(`vertical-align: ${value}`)
        return
      }

      if ((prop === 'margin-left' || prop === 'padding-left') && CSS_SIZE_RE.test(value)) {
        safe.push(`${prop}: ${value}`)
      }
    })

  return safe.join('; ')
}

export function sanitizeRichTextHtml(input: string) {
  const normalized = normalizeRichTextContent(input)

  if (typeof window === 'undefined') {
    return normalized
  }

  const doc = new DOMParser().parseFromString(normalized, 'text/html')

  const cleanNode = (node: Node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return

    let element = node as HTMLElement
    let tag = element.tagName.toLowerCase()

    if (['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta'].includes(tag)) {
      element.remove()
      return
    }

    if (tag === 'font') {
      const replacement = doc.createElement('span')
      const inlineRules: string[] = []
      const color = element.getAttribute('color')?.trim().toLowerCase()
      const face = element.getAttribute('face')?.trim().toLowerCase()
      const size = element.getAttribute('size')?.trim()

      if (color && CSS_COLOR_RE.test(color)) inlineRules.push(`color: ${color}`)
      if (face && CSS_FONT_FAMILY_RE.test(face)) inlineRules.push(`font-family: ${face}`)
      if (size) {
        const mapped = mapLegacyFontSizeToPx(size)
        if (mapped) inlineRules.push(`font-size: ${mapped}`)
      }

      const existingStyle = sanitizeStyleAttribute(element.getAttribute('style') ?? '')
      if (existingStyle) inlineRules.push(existingStyle)
      if (inlineRules.length > 0) {
        replacement.setAttribute('style', inlineRules.join('; '))
      }

      while (element.firstChild) {
        replacement.appendChild(element.firstChild)
      }
      element.replaceWith(replacement)
      element = replacement
      tag = 'span'
    }

    if (!ALLOWED_TAGS.has(tag)) {
      const parent = element.parentNode
      if (!parent) return
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element)
      }
      parent.removeChild(element)
      return
    }

    const attrs = Array.from(element.attributes)
    attrs.forEach((attr) => {
      const name = attr.name.toLowerCase()
      if (name.startsWith('on')) {
        element.removeAttribute(attr.name)
        return
      }

      if (name === 'style') {
        const safeStyle = sanitizeStyleAttribute(attr.value)
        if (!safeStyle) {
          element.removeAttribute('style')
        } else {
          element.setAttribute('style', safeStyle)
        }
        return
      }

      element.removeAttribute(attr.name)
    })

    Array.from(element.childNodes).forEach(cleanNode)
  }

  Array.from(doc.body.childNodes).forEach(cleanNode)

  const cleaned = doc.body.innerHTML.trim()
  return cleaned || '<p><br></p>'
}
