export type MediaEmbed =
  | {
      kind: 'audio'
      src: string
    }
  | {
      kind: 'video'
      src: string
    }
  | {
      kind: 'iframe'
      src: string
      title: string
      height?: number
      allow?: string
    }
  | {
      kind: 'unsupported'
      src: string
    }

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.weba', '.webm']
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v', '.ogv', '.ogg']
const SHORT_MEDIA_HOSTS = new Set([
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

function hasKnownExtension(pathname: string, extensions: string[]) {
  const lowered = pathname.toLowerCase()
  return extensions.some((extension) => lowered.endsWith(extension))
}

function parseInputUrl(input: string) {
  const normalized = input.trim()
  if (!normalized) return null

  try {
    return new URL(normalized)
  } catch {
    return null
  }
}

function resolveYouTubeEmbed(url: URL) {
  const host = url.hostname.toLowerCase()
  const segments = url.pathname.split('/').filter(Boolean)
  let id = ''

  if (host === 'youtu.be') {
    id = segments[0] ?? ''
  } else if (host.includes('youtube.com')) {
    id = url.searchParams.get('v') ?? ''
    if (!id && (segments[0] === 'embed' || segments[0] === 'shorts')) {
      id = segments[1] ?? ''
    }
  }

  if (!id) return null

  return {
    kind: 'iframe' as const,
    src: `https://www.youtube.com/embed/${id}`,
    title: 'Reproductor de YouTube',
    allow:
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
  }
}

function resolveVimeoEmbed(url: URL) {
  const host = url.hostname.toLowerCase()
  if (!host.includes('vimeo.com')) return null

  const segments = url.pathname.split('/').filter(Boolean)
  const id =
    segments.find((segment) => /^\d+$/.test(segment)) ??
    (segments[0] === 'video' ? segments[1] : '')
  if (!id) return null

  return {
    kind: 'iframe' as const,
    src: `https://player.vimeo.com/video/${id}`,
    title: 'Reproductor de Vimeo',
    allow: 'autoplay; fullscreen; picture-in-picture',
  }
}

function resolveSpotifyEmbed(url: URL) {
  const host = url.hostname.toLowerCase()
  if (!host.includes('spotify.com')) return null

  const segments = url.pathname.split('/').filter(Boolean)
  const type = segments[0]
  const id = segments[1]
  if (!type || !id) return null

  const compactHeight = type === 'track' || type === 'episode' ? 152 : 352
  return {
    kind: 'iframe' as const,
    src: `https://open.spotify.com/embed/${type}/${id}`,
    title: 'Reproductor de Spotify',
    height: compactHeight,
    allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
  }
}

function resolveSoundCloudEmbed(url: URL) {
  const host = url.hostname.toLowerCase()
  if (!host.includes('soundcloud.com')) return null

  return {
    kind: 'iframe' as const,
    src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.toString())}`,
    title: 'Reproductor de SoundCloud',
    height: 166,
    allow: 'autoplay',
  }
}

export function resolveMusicEmbed(input: string): MediaEmbed {
  const url = parseInputUrl(input)
  if (!url) {
    return { kind: 'unsupported', src: input }
  }

  const youtubeEmbed = resolveYouTubeEmbed(url)
  if (youtubeEmbed) return youtubeEmbed

  const spotifyEmbed = resolveSpotifyEmbed(url)
  if (spotifyEmbed) return spotifyEmbed

  const soundCloudEmbed = resolveSoundCloudEmbed(url)
  if (soundCloudEmbed) return soundCloudEmbed

  if (hasKnownExtension(url.pathname, AUDIO_EXTENSIONS)) {
    return { kind: 'audio', src: url.toString() }
  }

  if (hasKnownExtension(url.pathname, VIDEO_EXTENSIONS)) {
    return { kind: 'video', src: url.toString() }
  }

  return { kind: 'unsupported', src: url.toString() }
}

export function resolveVideoEmbed(input: string): MediaEmbed {
  const url = parseInputUrl(input)
  if (!url) {
    return { kind: 'unsupported', src: input }
  }

  const youtubeEmbed = resolveYouTubeEmbed(url)
  if (youtubeEmbed) return youtubeEmbed

  const vimeoEmbed = resolveVimeoEmbed(url)
  if (vimeoEmbed) return vimeoEmbed

  if (hasKnownExtension(url.pathname, VIDEO_EXTENSIONS)) {
    return { kind: 'video', src: url.toString() }
  }

  return { kind: 'unsupported', src: url.toString() }
}

export function hasShortMediaHost(input: string) {
  const url = parseInputUrl(input)
  if (!url) return false
  const host = url.hostname.toLowerCase()

  if (SHORT_MEDIA_HOSTS.has(host)) return true
  if (host.endsWith('.spotify.link')) return true

  return false
}
