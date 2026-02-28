import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const ALLOWED_SHORT_HOSTS = new Set([
  'spoti.fi',
  'spotify.link',
  'youtu.be',
  'on.soundcloud.com',
  'bit.ly',
  'tinyurl.com',
  't.co',
  'rb.gy',
  'cutt.ly',
  'shorturl.at',
])

function isAllowedShortHost(hostname: string) {
  const host = hostname.toLowerCase()
  if (ALLOWED_SHORT_HOSTS.has(host)) return true
  if (host.endsWith('.spotify.link')) return true
  return false
}

async function resolveByHeadOrGet(url: string) {
  try {
    const head = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      cache: 'no-store',
    })
    if (head.url) return head.url
  } catch {
    // Some providers block HEAD; fallback to GET.
  }

  const get = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    cache: 'no-store',
  })

  return get.url || url
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const rawUrl = typeof payload?.url === 'string' ? payload.url.trim() : ''
    if (!rawUrl) {
      return NextResponse.json({ error: 'Missing URL' }, { status: 400 })
    }

    let parsed: URL
    try {
      parsed = new URL(rawUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json({ error: 'Unsupported protocol' }, { status: 400 })
    }

    if (!isAllowedShortHost(parsed.hostname)) {
      return NextResponse.json({ url: rawUrl })
    }

    const resolved = await resolveByHeadOrGet(rawUrl)
    return NextResponse.json({ url: resolved })
  } catch {
    return NextResponse.json({ error: 'Could not resolve URL' }, { status: 500 })
  }
}
