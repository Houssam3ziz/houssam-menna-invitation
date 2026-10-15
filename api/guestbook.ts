/**
 * Message board ("Leave Us a Message").
 *
 *   GET  /api/guestbook → published messages, newest first (max 80).
 *   POST /api/guestbook → a typed message, a handwritten one, or both.
 *        • application/json:     { name, message, website, t }
 *        • multipart/form-data:  name, message, website, t, drawing (PNG)
 *
 * Abuse protection: server-side honeypot (`website`), minimum time on the
 * form (`t`), per-IP rate limit, strict sizes, PNG signature check, text
 * cleaning. With MODERATE_WISHES=true new messages wait in
 * guestbook-pending/ until approved on /admin.html.
 */
import { put } from '@vercel/blob'
import {
  SHORT_CDN_CACHE,
  cleanText,
  error,
  json,
  moderationOn,
  newId,
  readEntries,
  rateLimited,
  sniffImage,
  storageReady,
} from './_lib/http.js'
import type { GuestbookEntry } from './_lib/http.js'

const PUBLISHED = 'guestbook/'
const PENDING = 'guestbook-pending/'
const LIMITS = { name: 40, messageMin: 3, messageMax: 300, drawingBytes: 700 * 1024, minFormMs: 2500 } as const

export async function GET(): Promise<Response> {
  if (!storageReady()) return error('storage-unavailable', 503)
  try {
    const entries = (await readEntries(PUBLISHED, 80)).map(({ blobUrl: _u, ...e }) => e)
    return json(entries, 200, { 'Cache-Control': SHORT_CDN_CACHE })
  } catch (cause) {
    console.error('[api/guestbook] list failed', cause)
    return error('list-failed', 502)
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!storageReady()) return error('storage-unavailable', 503)
  if (rateLimited(request, 'wish', 5, 10 * 60_000)) return error('rate-limited', 429)

  const declared = Number(request.headers.get('content-length') ?? '0')
  if (declared > LIMITS.drawingBytes + 16_384) return error('too-large', 413)

  let fields: { name?: unknown; message?: unknown; website?: unknown; t?: unknown }
  let drawing: Uint8Array | null = null
  try {
    if ((request.headers.get('content-type') ?? '').includes('multipart/form-data')) {
      const form = await request.formData()
      fields = Object.fromEntries(['name', 'message', 'website', 't'].map((k) => [k, form.get(k) ?? undefined]))
      const file = form.get('drawing')
      if (file && typeof file !== 'string' && file.size > 0) {
        if (file.size > LIMITS.drawingBytes) return error('drawing-too-large', 413)
        drawing = new Uint8Array(await file.arrayBuffer())
      }
    } else {
      fields = (await request.json()) as typeof fields
    }
  } catch {
    return error('bad-request', 400)
  }

  // Bots fill every field and submit instantly; pretend success so they move on.
  if (typeof fields.website === 'string' && fields.website.trim()) return json({ ok: true }, 201)
  if (Number(fields.t) > 0 && Number(fields.t) < LIMITS.minFormMs) return error('too-fast', 429)

  const name = cleanText(fields.name, LIMITS.name)
  const message = cleanText(fields.message, LIMITS.messageMax)
  if (!name) return error('invalid-name', 422)
  if (!drawing && message.length < LIMITS.messageMin) return error('invalid-message', 422)
  if (drawing && sniffImage(drawing)?.type !== 'image/png') return error('invalid-drawing', 415)

  const id = newId('msg')
  const entry: GuestbookEntry = { id, name, message, createdAt: new Date().toISOString() }
  const pending = moderationOn()

  try {
    if (drawing) {
      const ink = await put(`ink/${id}.png`, Buffer.from(drawing.buffer, drawing.byteOffset, drawing.byteLength), {
        access: 'public',
        contentType: 'image/png',
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      })
      entry.drawing = ink.url
    }
    await put(`${pending ? PENDING : PUBLISHED}${id}.json`, JSON.stringify(entry), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      cacheControlMaxAge: 60,
    })
    return json({ ...entry, pending }, 201, { 'Cache-Control': 'no-store' })
  } catch (cause) {
    console.error('[api/guestbook] write failed', cause)
    return error('write-failed', 502)
  }
}
