'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      router.push('/notebook')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en el inicio de sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cover bg-center flex items-center justify-center p-4" style={{ backgroundImage: 'url(/images/wood-bg.jpg)' }}>
      <div className="w-full max-w-md">
        <div className="bg-parchment rounded-lg shadow-2xl p-8 border-4 border-leather">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-serif font-bold text-leather mb-2">Bienvenido</h1>
            <p className="text-leather-light">Abre tu libreta compartida</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-serif text-leather mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-brass" size={18} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full pl-10 pr-3 py-2 border-2 border-leather rounded-lg focus:outline-none focus:border-brass bg-parchment text-ink"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-serif text-leather mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-brass" size={18} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-3 py-2 border-2 border-leather rounded-lg focus:outline-none focus:border-brass bg-parchment text-ink"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-leather hover:bg-leather-dark text-parchment font-serif py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-leather text-sm">
              ¿No tienes cuenta?{' '}
              <Link href="/auth/sign-up" className="text-brass hover:text-brass-light font-serif font-bold">
                Regístrate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
