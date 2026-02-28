'use client'

import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-cover bg-center flex items-center justify-center p-4" style={{ backgroundImage: 'url(/images/wood-bg.jpg)' }}>
      <div className="w-full max-w-md">
        <div className="bg-parchment rounded-lg shadow-2xl p-8 border-4 border-leather text-center">
          <CheckCircle className="w-16 h-16 text-brass mx-auto mb-4" />
          <h1 className="text-3xl font-serif font-bold text-leather mb-2">¡Bienvenido!</h1>
          <p className="text-leather mb-4">Tu cuenta ha sido creada correctamente.</p>
          <p className="text-leather-light text-sm mb-6">
            Te hemos enviado un correo de confirmación. Por favor, verifica tu email para activar tu cuenta.
          </p>
          <Link href="/auth/login" className="inline-block bg-leather hover:bg-leather-dark text-parchment font-serif py-2 px-6 rounded-lg transition">
            Ir a Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
