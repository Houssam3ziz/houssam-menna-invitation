/**
 * Guest photos.
 *
 *   GET  /api/photos → every guest photo, newest first.
 *   POST /api/photos → multipart: full photo + small thumbnail (the browser has
 *                      already resized and re-encoded both, stripping EXIF/GPS).
 *
 * The file is checked here by its magic bytes — never by the Content-Type the
 * client claims — then written to Vercel Blob. No storage key ever reaches
 * the browser: BLOB_READ_WRITE_TOKEN is injected by Vercel at runtime.
 */
import { list, put } from '@vercel/blob'
import { SHORT_CDN_CACHE, error, json, newId, rateLimited, sniffImage, storageReady } from './_lib/http.js'

const PREFIX = 'guests/'
const THUMBS = 'thumbs/'
/** Vercel Functions accept request bodies up to 4.5 MB (photo + thumbnail). */
const MAX_BYTES = 4 * 1024 * 1024
const MAX_THUMB = 300 * 1024
const MAX_LISTED = 600

interface GuestPhoto {
  id: string
  url: string
  /** ~480 px preview for the grid; the full photo loads only in the lightbox. */
  thumb: string
  createdAt: string
}

const toBuffer = (b: Uint8Array) => Buffer.from(b.buffer, b.byteOffset, b.byteLength)
const opts = (contentType: string) => ({
  access: 'public' as const,
  contentType,
  addRandomSuffix: false,
  // Immutable files: let the CDN keep them for a year.
  cacheControlMaxAge: 60 * 60 * 24 * 365,
})

export async function GET(): Promise<Response> {
  if (!storageReady()) return error('storage-unavailable', 503)

  try {
    const thumbs = new Map<string, string>()
    let cursor: string | undefined
    do {
      const page = await list({ prefix: THUMBS, limit: 1000, cursor })
      for (const blob of page.blobs) thumbs.set(blob.pathname.slice(THUMBS.length), blob.url)
      cursor = page.hasMore ? page.cursor : undefined
    } while (cursor)

    const photos: GuestPhoto[] = []
    do {
      const page = await list({ prefix: PREFIX, limit: 1000, cursor })
      for (const blob of page.blobs) {
        const key = blob.pathname.slice(PREFIX.length)
        photos.push({
          id: blob.pathname,
          url: blob.url,
          thumb: thumbs.get(key) ?? blob.url,
          createdAt: new Date(blob.uploadedAt).toISOString(),
        })
      }
      cursor = page.hasMore ? page.cursor : undefined
    } while (cursor && photos.length < MAX_LISTED)

    photos.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    return json(photos.slice(0, MAX_LISTED), 200, { 'Cache-Control': SHORT_CDN_CACHE })
  } catch (cause) {
    console.error('[api/photos] list failed', cause)
    return error('list-failed', 502)
  }
}

/**
 * POST multipart/form-data: `photo` (≤ 4 MB) and optional `thumb` (≤ 300 KB).
 * Both were resized and re-encoded in the browser (EXIF/GPS stripped);
 * here they are re-checked by signature, never by the claimed type.
 */
export async function POST(request: Request): Promise<Response> {
  if (!storageReady()) return error('storage-unavailable', 503)
  if (rateLimited(request, 'photo', 40, 10 * 60_000)) return error('rate-limited', 429)

  const declared = Number(request.headers.get('content-length') ?? '0')
  if (declared > MAX_BYTES + MAX_THUMB + 4096) return error('too-large', 413)

  let photo: Uint8Array
  let thumb: Uint8Array | null = null
  try {
    const form = await request.formData()
    const file = form.get('photo')
    if (!file || typeof file === 'string') return error('missing-photo', 400)
    if (file.size === 0) return error('empty', 400)
    if (file.size > MAX_BYTES) return error('too-large', 413)
    photo = new Uint8Array(await file.arrayBuffer())
    const t = form.get('thumb')
    if (t && typeof t !== 'string' && t.size > 0 && t.size <= MAX_THUMB) thumb = new Uint8Array(await t.arrayBuffer())
  } catch {
    return error('bad-request', 400)
  }

  const kind = sniffImage(photo)
  if (!kind) return error('unsupported-type', 415)
  const thumbKind = thumb ? sniffImage(thumb) : null

  const key = `${new Date().toISOString().slice(0, 10)}/${newId('photo')}`
  try {
    const full = await put(`${PREFIX}${key}.${kind.ext}`, toBuffer(photo), opts(kind.type))
    const small =
      thumb && thumbKind
        ? await put(`${THUMBS}${key}.${kind.ext}`, toBuffer(thumb), opts(thumbKind.type))
        : null
    const result: GuestPhoto = { id: full.pathname, url: full.url, thumb: small?.url ?? full.url, createdAt: new Date().toISOString() }
    return json(result, 201, { 'Cache-Control': 'no-store' })
  } catch (cause) {
    console.error('[api/photos] write failed', cause)
    return error('write-failed', 502)
  }
}
