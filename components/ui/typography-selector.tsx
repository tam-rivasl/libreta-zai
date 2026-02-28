'use client'

import { useState, useEffect } from 'react'
import { Type } from 'lucide-react'

type FontFamily = 'lora' | 'playfair' | 'georgia'

interface TypographySelectorProps {
  onChange?: (font: FontFamily) => void
}

const fonts: { id: FontFamily; name: string; family: string }[] = [
  { id: 'lora', name: 'Lora', family: 'font-lora' },
  { id: 'playfair', name: 'Playfair', family: 'font-playfair' },
  { id: 'georgia', name: 'Georgia', family: 'Georgia, serif' },
]

export function TypographySelector({ onChange }: TypographySelectorProps) {
  const [selectedFont, setSelectedFont] = useState<FontFamily>('lora')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('notebook-font') as FontFamily | null
    if (saved && fonts.find(f => f.id === saved)) {
      setSelectedFont(saved)
    }
  }, [])

  const handleSelect = (font: FontFamily) => {
    setSelectedFont(font)
    localStorage.setItem('notebook-font', font)
    onChange?.(font)
    setIsOpen(false)
  }

  const currentFont = fonts.find(f => f.id === selectedFont)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded border-2 transition-all"
        style={{
          borderColor: '#d4c5a9',
          background: '#f5f0e1',
          color: '#8B4513',
        }}
      >
        <Type size={16} />
        <span className="text-xs font-sans">{currentFont?.name}</span>
      </button>

      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 rounded-lg shadow-lg border-2 z-50"
          style={{
            background: '#f5f0e1',
            borderColor: '#8B4513',
            minWidth: '150px',
          }}
        >
          {fonts.map(font => (
            <button
              key={font.id}
              onClick={() => handleSelect(font.id)}
              className="w-full text-left px-4 py-2 hover:bg-parchment-dark transition-colors text-sm"
              style={{
                fontFamily: font.id === 'georgia' ? font.family : undefined,
                color: selectedFont === font.id ? '#8B4513' : '#6b5744',
                background: selectedFont === font.id ? 'rgba(139, 69, 19, 0.1)' : 'transparent',
              }}
            >
              {font.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
