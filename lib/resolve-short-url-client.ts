'use client'

import { hasShortMediaHost } from '@/lib/media-embed'

export async function resolveShortMediaUrl(input: string) {
  const normalized = input.trim()
  if (!normalized || !hasShortMediaHost(normalized)) return normalized

  try {
    const response = await fetch('/api/resolve-short-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: normalized }),
    })

    if (!response.ok) return normalized

    const payload = await response.json()
    if (!payload || typeof payload.url !== 'string' || payload.url.length === 0) {
      return normalized
    }

    return payload.url
  } catch {
    return normalized
  }
}
