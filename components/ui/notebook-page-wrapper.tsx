'use client'

import { ReactNode } from 'react'
import { TypographySelector } from './typography-selector'

interface NotebookPageWrapperProps {
  title: string
  subtitle?: string
  children: ReactNode
  onFontChange?: (font: string) => void
}

export function NotebookPageWrapper({
  title,
  subtitle,
  children,
  onFontChange,
}: NotebookPageWrapperProps) {
  return (
    <div className="w-full h-full flex flex-col bg-parchment relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 pb-3 border-b-2" style={{ borderColor: '#d4c5a9' }}>
        <div className="flex-1">
          <h2 className="text-2xl font-serif font-bold text-leather">{title}</h2>
          {subtitle && (
            <p className="text-xs text-leather-light mt-1">{subtitle}</p>
          )}
        </div>
        <TypographySelector onChange={onFontChange} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
