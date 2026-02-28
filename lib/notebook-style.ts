export type NotebookFontId =
  | 'lora'
  | 'playfair'
  | 'roboto'
  | 'georgia'
  | 'times'
  | 'garamond'
  | 'palatino'
  | 'arial'
  | 'verdana'
  | 'mono'

export type NotebookIconId = 'fine' | 'classic' | 'bold'
export type NotebookThemeId = 'classic' | 'rose' | 'forest' | 'midnight'

export interface NotebookStylePrefs {
  font: NotebookFontId
  icons: NotebookIconId
  theme: NotebookThemeId
  accentColor: string
  paperColor: string
  inkColor: string
  lineColor: string
  coverImageUrl: string | null
  coverImageUrls: string[]
}

export interface NotebookThemeDefinition {
  id: NotebookThemeId
  label: string
  description: string
  accentColor: string
  paperColor: string
  inkColor: string
  lineColor: string
}

export interface NotebookResolvedColors {
  accent: string
  paper: string
  ink: string
  line: string
  muted: string
  border: string
  onAccent: string
  accentSoft: string
  gold: string
  goldDark: string
  marginLine: string
  woodOverlay: string
}

export const NOTEBOOK_FONT_FAMILY_CSS_VAR =
  'var(--notebook-font-family, "Lora", Georgia, serif)'

export const NOTEBOOK_FONTS: Array<{
  id: NotebookFontId
  label: string
  family: string
}> = [
  { id: 'lora', label: 'Lora', family: '"Lora", "Georgia", serif' },
  { id: 'playfair', label: 'Playfair', family: '"Playfair Display", "Georgia", serif' },
  { id: 'roboto', label: 'Roboto', family: 'var(--font-roboto), "Roboto", "Arial", sans-serif' },
  { id: 'georgia', label: 'Georgia', family: '"Georgia", serif' },
  { id: 'times', label: 'Times', family: '"Times New Roman", "Times", serif' },
  { id: 'garamond', label: 'Garamond', family: '"Garamond", "Times New Roman", serif' },
  { id: 'palatino', label: 'Palatino', family: '"Palatino Linotype", "Book Antiqua", serif' },
  { id: 'arial', label: 'Arial', family: '"Arial", "Helvetica", sans-serif' },
  { id: 'verdana', label: 'Verdana', family: '"Verdana", "Geneva", sans-serif' },
  { id: 'mono', label: 'Mono', family: '"Courier New", "Liberation Mono", monospace' },
]

export const NOTEBOOK_ICONS: Array<{
  id: NotebookIconId
  label: string
  strokeWidth: number
}> = [
  { id: 'fine', label: 'Fino', strokeWidth: 1.55 },
  { id: 'classic', label: 'Clásico', strokeWidth: 2 },
  { id: 'bold', label: 'Fuerte', strokeWidth: 2.5 },
]

export const NOTEBOOK_THEMES: NotebookThemeDefinition[] = [
  {
    id: 'classic',
    label: 'Clásico',
    description: 'Cuero marrón y hojas crema tradicionales.',
    accentColor: '#8B4513',
    paperColor: '#f5ecd8',
    inkColor: '#3a2518',
    lineColor: '#d4c5a9',
  },
  {
    id: 'rose',
    label: 'Romántico',
    description: 'Tonos cálidos suaves en rosa viejo.',
    accentColor: '#A84D6A',
    paperColor: '#F8EDEB',
    inkColor: '#4A2A35',
    lineColor: '#DEC4C8',
  },
  {
    id: 'forest',
    label: 'Bosque',
    description: 'Verde profundo y papel natural.',
    accentColor: '#2F6A4F',
    paperColor: '#F0ECDD',
    inkColor: '#253A2E',
    lineColor: '#C9C6AD',
  },
  {
    id: 'midnight',
    label: 'Noche',
    description: 'Azul tinta elegante y contraste suave.',
    accentColor: '#2F4A7A',
    paperColor: '#ECE9E0',
    inkColor: '#1E2A3F',
    lineColor: '#C2C8D7',
  },
]

function getThemeById(themeId: NotebookThemeId) {
  return NOTEBOOK_THEMES.find((theme) => theme.id === themeId) ?? NOTEBOOK_THEMES[0]
}

const DEFAULT_THEME = getThemeById('classic')

export const DEFAULT_NOTEBOOK_STYLE: NotebookStylePrefs = {
  font: 'times',
  icons: 'bold',
  theme: DEFAULT_THEME.id,
  accentColor: DEFAULT_THEME.accentColor,
  paperColor: DEFAULT_THEME.paperColor,
  inkColor: DEFAULT_THEME.inkColor,
  lineColor: DEFAULT_THEME.lineColor,
  coverImageUrl: null,
  coverImageUrls: [],
}

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

function normalizeHexColor(input: string) {
  const raw = input.trim()
  if (!HEX_COLOR_RE.test(raw)) return null
  if (raw.length === 4) {
    const [hash, r, g, b] = raw
    return `${hash}${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return raw.toLowerCase()
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex) ?? '#000000'
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  }
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0'))
    .join('')}`
}

function mixHex(base: string, target: string, ratio: number) {
  const a = hexToRgb(base)
  const b = hexToRgb(target)
  return rgbToHex(
    a.r + (b.r - a.r) * ratio,
    a.g + (b.g - a.g) * ratio,
    a.b + (b.b - a.b) * ratio,
  )
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const linear = [r, g, b].map((channel) => {
    const value = channel / 255
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function ensureThemeColor(input: string, fallback: string) {
  return normalizeHexColor(input) ?? fallback
}

function normalizeCoverImageUrls(value: unknown) {
  if (!Array.isArray(value)) return []
  const urls = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
  return Array.from(new Set(urls))
}

export function hydrateNotebookStylePrefs(value: unknown): NotebookStylePrefs {
  const fallback = DEFAULT_NOTEBOOK_STYLE
  if (!value || typeof value !== 'object') return fallback
  const candidate = value as Record<string, unknown>
  const coverImageUrls = normalizeCoverImageUrls(candidate.coverImageUrls)
  const hasCoverImageUrlField = Object.prototype.hasOwnProperty.call(candidate, 'coverImageUrl')
  const normalizedCoverImageUrl =
    typeof candidate.coverImageUrl === 'string' ? candidate.coverImageUrl.trim() : ''
  const coverImageUrl: string | null =
    normalizedCoverImageUrl.length > 0
      ? normalizedCoverImageUrl
      : (hasCoverImageUrlField && candidate.coverImageUrl === null)
        ? null
        : (coverImageUrls[0] ?? null)

  const theme = NOTEBOOK_THEMES.some((item) => item.id === candidate.theme)
    ? (candidate.theme as NotebookThemeId)
    : fallback.theme
  const themeDefaults = getThemeById(theme)

  return {
    font: NOTEBOOK_FONTS.some((font) => font.id === candidate.font)
      ? (candidate.font as NotebookFontId)
      : fallback.font,
    icons: NOTEBOOK_ICONS.some((icon) => icon.id === candidate.icons)
      ? (candidate.icons as NotebookIconId)
      : fallback.icons,
    theme,
    accentColor: ensureThemeColor(
      typeof candidate.accentColor === 'string' ? candidate.accentColor : '',
      themeDefaults.accentColor,
    ),
    paperColor: ensureThemeColor(
      typeof candidate.paperColor === 'string' ? candidate.paperColor : '',
      themeDefaults.paperColor,
    ),
    inkColor: ensureThemeColor(
      typeof candidate.inkColor === 'string' ? candidate.inkColor : '',
      themeDefaults.inkColor,
    ),
    lineColor: ensureThemeColor(
      typeof candidate.lineColor === 'string' ? candidate.lineColor : '',
      themeDefaults.lineColor,
    ),
    coverImageUrl,
    coverImageUrls:
      coverImageUrl && !coverImageUrls.includes(coverImageUrl)
        ? [coverImageUrl, ...coverImageUrls]
        : coverImageUrls,
  }
}

export function isNotebookStylePrefs(value: unknown): value is NotebookStylePrefs {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    NOTEBOOK_FONTS.some((font) => font.id === candidate.font) &&
    NOTEBOOK_ICONS.some((icon) => icon.id === candidate.icons) &&
    NOTEBOOK_THEMES.some((theme) => theme.id === candidate.theme) &&
    typeof candidate.accentColor === 'string' &&
    typeof candidate.paperColor === 'string' &&
    typeof candidate.inkColor === 'string' &&
    typeof candidate.lineColor === 'string' &&
    (typeof candidate.coverImageUrl === 'string' || candidate.coverImageUrl === null) &&
    Array.isArray(candidate.coverImageUrls)
  )
}

export function applyThemePreset(
  current: NotebookStylePrefs,
  themeId: NotebookThemeId,
): NotebookStylePrefs {
  const theme = getThemeById(themeId)
  return {
    ...current,
    theme: theme.id,
    accentColor: theme.accentColor,
    paperColor: theme.paperColor,
    inkColor: theme.inkColor,
    lineColor: theme.lineColor,
  }
}

export function resolveNotebookColors(style: NotebookStylePrefs): NotebookResolvedColors {
  const theme = getThemeById(style.theme)
  const accent = ensureThemeColor(style.accentColor, theme.accentColor)
  const paper = ensureThemeColor(style.paperColor, theme.paperColor)
  const ink = ensureThemeColor(style.inkColor, theme.inkColor)
  const line = ensureThemeColor(style.lineColor, theme.lineColor)

  const onAccent = luminance(accent) > 0.45 ? '#1f120a' : '#f8f1e4'
  const muted = mixHex(ink, paper, 0.45)
  const border = mixHex(line, ink, 0.18)
  const accentSoft = mixHex(accent, paper, 0.78)
  const gold = mixHex(accent, '#c49b2b', 0.45)
  const goldDark = mixHex(accent, '#7b5b11', 0.4)
  const marginLine = mixHex(accent, '#b34d4d', 0.35)
  const woodOverlay = mixHex(accent, '#2a1508', 0.72)

  return {
    accent,
    paper,
    ink,
    line,
    muted,
    border,
    onAccent,
    accentSoft,
    gold,
    goldDark,
    marginLine,
    woodOverlay,
  }
}
