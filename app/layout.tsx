import type { Metadata } from 'next'
import { Lora, Playfair_Display, Roboto } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const _lora = Lora({ subsets: ["latin"], variable: "--font-lora" });
const _playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const _roboto = Roboto({ subsets: ['latin'], variable: '--font-roboto' })

export const metadata: Metadata = {
  title: 'Nuestra Libreta',
  description: 'Una libreta compartida para dos almas',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport = {
  themeColor: '#3a2518',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const shouldLoadAnalytics = process.env.NODE_ENV === 'production' && process.env.VERCEL === '1'

  return (
    <html lang="es">
      <body className={`${_lora.variable} ${_playfair.variable} ${_roboto.variable} font-sans antialiased`}>
        {children}
        <Toaster />
        {shouldLoadAnalytics ? <Analytics /> : null}
      </body>
    </html>
  )
}
