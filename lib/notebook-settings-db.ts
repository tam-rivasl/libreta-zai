import {
  DEFAULT_NOTEBOOK_STYLE,
  type NotebookStylePrefs,
  hydrateNotebookStylePrefs,
} from '@/lib/notebook-style'

export interface NotebookSettingsRow {
  user_id: string
  font: string
  icons: string
  theme: string
  accent_color: string
  paper_color: string
  ink_color: string
  line_color: string
  cover_image_url: string | null
  cover_image_urls: string[] | null
  updated_at?: string
  created_at?: string
}

export function rowToNotebookStyle(row: Partial<NotebookSettingsRow> | null | undefined): NotebookStylePrefs {
  if (!row) return DEFAULT_NOTEBOOK_STYLE
  return hydrateNotebookStylePrefs({
    font: row.font,
    icons: row.icons,
    theme: row.theme,
    accentColor: row.accent_color,
    paperColor: row.paper_color,
    inkColor: row.ink_color,
    lineColor: row.line_color,
    coverImageUrl: row.cover_image_url ?? null,
    coverImageUrls: Array.isArray(row.cover_image_urls) ? row.cover_image_urls : [],
  })
}

export function notebookStyleToRow(userId: string, style: NotebookStylePrefs): NotebookSettingsRow {
  return {
    user_id: userId,
    font: style.font,
    icons: style.icons,
    theme: style.theme,
    accent_color: style.accentColor,
    paper_color: style.paperColor,
    ink_color: style.inkColor,
    line_color: style.lineColor,
    cover_image_url: style.coverImageUrl,
    cover_image_urls: style.coverImageUrls,
  }
}
