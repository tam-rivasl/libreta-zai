'use client'

interface VintageButtonProps {
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger' | 'subtle'
  children: React.ReactNode
  className?: string
}

export function VintageButton({
  onClick,
  disabled = false,
  variant = 'primary',
  children,
  className = '',
}: VintageButtonProps) {
  const baseStyles = 'px-4 py-2 rounded font-sans text-sm transition-all flex items-center gap-2 disabled:opacity-50'

  const variantStyles: Record<string, string> = {
    primary: 'bg-[#B8860B] hover:bg-[#DAA520] text-[#f5f0e1] border-2 border-[#B8860B] hover:border-[#DAA520]',
    secondary: 'bg-[#A0522D] hover:bg-[#8B4513] text-[#f5f0e1] border-2 border-[#A0522D] hover:border-[#8B4513]',
    danger: 'text-red-600 hover:text-red-700 border-2 border-red-600 hover:border-red-700 hover:bg-red-50',
    subtle: 'text-[#B8860B] hover:text-[#DAA520] border-b-2 border-[#B8860B] hover:border-[#DAA520] bg-transparent',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
