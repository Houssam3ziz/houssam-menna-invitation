/**
 * Serves files from the PRIVATE Blob store.
 *
 *   GET /api/media?p=<pathname>   (guests/…, thumbs/…, ink/… only)
 *
 * Pathnames are unique and never overwritten, so responses are cached as
 * immutable at the CDN and in the browser: each file is read from Blob once.
 */
import { get } from '@vercel/blob'
import { ACCESS, MEDIA_PREFIXES, error, storageReady } from './_lib/http.js'

const SAFE_PATH = /^[a-z]+\/[\w./-]+\.(jpg|png|webp)$/

export async function GET(request: Request): Promise<Response> {
  if (!storageReady()) return error('storage-unavailable', 503)
  const pathname = new URL(request.url).searchParams.get('p') ?? ''
  if (!SAFE_PATH.test(pathname) || pathname.includes('..') || !MEDIA_PREFIXES.some((p) => pathname.startsWith(p))) {
    return error('not-found', 404)
  }
  try {
    const res = await get(pathname, { access: ACCESS })
    if (!res || res.statusCode !== 200) return error('not-found', 404)
    return new Response(res.stream, {
      headers: {
        'Content-Type': res.blob.contentType,
        'Content-Length': String(res.blob.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (cause) {
    console.error('[api/media] read failed', pathname, cause)
    return error('read-failed', 502)
  }
}
