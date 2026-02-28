'use client'

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-cover bg-center flex items-center justify-center p-4" style={{ backgroundImage: 'url(/images/wood-bg.jpg)' }}>
      <div className="w-full max-w-md">
        <div className="bg-parchment rounded-lg shadow-2xl p-8 border-4 border-leather text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-3xl font-serif font-bold text-leather mb-2">Error de Autenticación</h1>
          <p className="text-leather mb-6">Ocurrió un problema durante el proceso de autenticación.</p>
          <Link href="/auth/login" className="inline-block bg-leather hover:bg-leather-dark text-parchment font-serif py-2 px-6 rounded-lg transition">
            Volver a Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
