'use client'

interface VintageToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}

export function VintageToggle({
  checked,
  onChange,
  label,
  disabled = false,
}: VintageToggleProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <div className="relative flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className="w-12 h-6 rounded-full transition-all relative border-2"
          style={{
            background: checked ? '#B8860B' : '#f5f0e1',
            borderColor: checked ? '#B8860B' : '#d4c5a9',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div
            className="w-5 h-5 rounded-full transition-all absolute top-0.5"
            style={{
              background: checked ? '#f5f0e1' : '#8B4513',
              left: checked ? '20px' : '1px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          />
        </div>
      </div>
      <span className="text-sm text-leather font-sans">{label}</span>
    </label>
  )
}
