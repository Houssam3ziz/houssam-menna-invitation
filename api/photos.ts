/**
 * Guest photos.
 *
 *   GET  /api/photos → APPROVED guest photos only, newest first.
 *   POST /api/photos → multipart: full photo + small thumbnail (the browser has
 *                      already resized and re-encoded both, stripping EXIF/GPS).
 *                      New photos wait in pending/ until approved on /admin.html.
 *
 * The file is checked here by its magic bytes — never by the Content-Type the
 * client claims — then written to the private Blob store. No storage key ever
 * reaches the browser: BLOB_READ_WRITE_TOKEN is injected by Vercel at runtime.
 */
import { put } from '@vercel/blob'
import { ACCESS, SHORT_CDN_CACHE, error, json, newId, rateLimited, readJson, sniffImage, storageReady } from './_lib/http.js'
import { notify } from './_lib/notify.js'
import { AREAS, listPhotos } from './_lib/photos.js'

/** Vercel Functions accept request bodies up to 4.5 MB (photo + thumbnail). */
const MAX_BYTES = 4 * 1024 * 1024
const MAX_THUMB = 300 * 1024

const toBuffer = (b: Uint8Array) => Buffer.from(b.buffer, b.byteOffset, b.byteLength)
const opts = (contentType: string) => ({
  access: ACCESS,
  contentType,
  addRandomSuffix: false,
  // Immutable files: let the CDN keep them for a year.
  cacheControlMaxAge: 60 * 60 * 24 * 365,
})

export async function GET(): Promise<Response> {
  if (!storageReady()) return error('storage-unavailable', 503)
  try {
    return json(await listPhotos('approved'), 200, { 'Cache-Control': SHORT_CDN_CACHE })
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
  if ((request.headers.get('content-type') ?? '').includes('application/json')) return notifyBatch(request)
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

  const key = `${new Date().toISOString().slice(0, 10)}/${newId('photo')}.${kind.ext}`
  try {
    await put(AREAS.pending.full + key, toBuffer(photo), opts(kind.type))
    if (thumb && thumbKind) await put(AREAS.pending.thumb + key, toBuffer(thumb), opts(thumbKind.type))
    return json({ ok: true, pending: true, id: AREAS.pending.full + key }, 201, { 'Cache-Control': 'no-store' })
  } catch (cause) {
    console.error('[api/photos] write failed', cause)
    return error('write-failed', 502)
  }
}

/**
 * POST application/json { ids: string[] } — sent once after a guest finishes
 * a batch, so the couple gets one email per batch rather than one per photo.
 * Only ids of photos waiting in pending/ are accepted.
 */
async function notifyBatch(request: Request): Promise<Response> {
  if (rateLimited(request, 'photo-notify', 4, 10 * 60_000)) return json({ ok: true }, 202)
  const body = await readJson<{ ids?: unknown }>(request, 8192)
  const ids = Array.isArray(body?.ids) ? body.ids.filter(isPendingId).slice(0, 10) : []
  if (ids.length === 0) return error('bad-request', 400)
  const n = ids.length
  await notify({
    subject: `${n} new guest photo${n === 1 ? '' : 's'} — waiting for your approval`,
    lines: [`A guest just shared ${n} photo${n === 1 ? '' : 's'}. They will appear in the gallery only after you approve them on the admin page.`],
    images: ids.map((id) => `/api/media?p=${encodeURIComponent(id.replace(AREAS.pending.full, AREAS.pending.thumb))}`),
  })
  return json({ ok: true }, 202, { 'Cache-Control': 'no-store' })
}

const PENDING_ID = /^pending\/guests\/\d{4}-\d{2}-\d{2}\/photo_[a-z0-9]+_[a-f0-9]{8,32}\.(jpg|png|webp)$/
const isPendingId = (value: unknown): value is string => typeof value === 'string' && PENDING_ID.test(value)
