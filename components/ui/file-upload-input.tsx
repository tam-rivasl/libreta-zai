'use client'

import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'

interface FileUploadInputProps {
  onFileSelect: (file: File) => void
  accept?: string
  disabled?: boolean
  loading?: boolean
}

export function FileUploadInput({
  onFileSelect,
  accept = 'image/*',
  disabled = false,
  loading = false,
}: FileUploadInputProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled || loading) return
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      onFileSelect(files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      onFileSelect(files[0])
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && !loading && fileInputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center w-full p-8 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
        isDragging ? 'border-amber-600 bg-amber-50/30' : 'border-amber-300'
      } ${disabled || loading ? 'opacity-60 cursor-not-allowed' : 'hover:border-amber-600 hover:bg-amber-50/20'}`}
      style={{
        borderColor: isDragging ? 'var(--nb-border, #c4a87a)' : 'var(--nb-line, #d4c5a9)',
        backgroundColor: isDragging ? 'rgba(196, 168, 122, 0.1)' : 'rgba(212, 197, 169, 0.05)',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled || loading}
        className="hidden"
      />

      <Upload
        size={32}
        style={{
          color: 'var(--nb-accent, #8B4513)',
          marginBottom: '8px',
        }}
      />

      <p
        className="text-sm font-medium text-center"
        style={{ color: 'var(--nb-ink, #3a2518)', fontFamily: "'Lora', 'Georgia', serif" }}
      >
        {loading ? 'Subiendo...' : 'Arrastra un archivo aquí'}
      </p>
      <p
        className="text-xs text-center mt-1"
        style={{ color: 'var(--nb-muted, #8B7355)' }}
      >
        o haz clic para seleccionar
      </p>
    </div>
  )
}

