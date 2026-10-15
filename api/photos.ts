/**
 * Guest photos.
 *
 *   GET  /api/photos → every guest photo, newest first.
 *   POST /api/photos → raw image body (the browser has already resized it and
 *                      re-encoded it to JPEG, which strips EXIF/GPS).
 *
 * The file is checked here by its magic bytes — never by the Content-Type the
 * client claims — then written to Vercel Blob. No storage key ever reaches
 * the browser: BLOB_READ_WRITE_TOKEN is injected by Vercel at runtime.
 */
import { list, put } from '@vercel/blob'
import { SHORT_CDN_CACHE, error, json, newId, storageReady } from './_lib/http.js'

const PREFIX = 'guests/'
/** Vercel Functions accept request bodies up to 4.5 MB. */
const MAX_BYTES = 4 * 1024 * 1024
const MAX_LISTED = 600

interface GuestPhoto {
  id: string
  url: string
  createdAt: string
}

function sniff(bytes: Uint8Array): { type: string; ext: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { type: 'image/png', ext: 'png' }
  const riff = String.fromCharCode(...bytes.slice(0, 4))
  const webp = String.fromCharCode(...bytes.slice(8, 12))
  if (riff === 'RIFF' && webp === 'WEBP') return { type: 'image/webp', ext: 'webp' }
  return null
}

export async function GET(): Promise<Response> {
  if (!storageReady()) return error('storage-unavailable', 503)

  try {
    const photos: GuestPhoto[] = []
    let cursor: string | undefined
    do {
      const page = await list({ prefix: PREFIX, limit: 1000, cursor })
      for (const blob of page.blobs) {
        photos.push({ id: blob.pathname, url: blob.url, createdAt: new Date(blob.uploadedAt).toISOString() })
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

export async function POST(request: Request): Promise<Response> {
  if (!storageReady()) return error('storage-unavailable', 503)

  const declared = Number(request.headers.get('content-length') ?? '0')
  if (declared > MAX_BYTES) return error('too-large', 413)

  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(await request.arrayBuffer())
  } catch {
    return error('bad-request', 400)
  }
  if (bytes.byteLength === 0) return error('empty', 400)
  if (bytes.byteLength > MAX_BYTES) return error('too-large', 413)

  const kind = sniff(bytes)
  if (!kind) return error('unsupported-type', 415)

  const day = new Date().toISOString().slice(0, 10)
  try {
    const blob = await put(`${PREFIX}${day}/${newId("photo")}.${kind.ext}`, Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength), {
      access: 'public',
      contentType: kind.type,
      addRandomSuffix: true,
      // Immutable files: let the CDN keep them for a year.
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    })
    const photo: GuestPhoto = { id: blob.pathname, url: blob.url, createdAt: new Date().toISOString() }
    return json(photo, 201, { 'Cache-Control': 'no-store' })
  } catch (cause) {
    console.error('[api/photos] write failed', cause)
    return error('write-failed', 502)
  }
}
