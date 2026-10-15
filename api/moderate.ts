/**
 * Message moderation, used by /admin.html.
 *
 *   GET  /api/moderate            → { pending: [...], published: [...] }
 *   POST /api/moderate {id, action: 'approve' | 'reject' | 'remove'}
 *
 * Every call needs the header `x-admin-key` matching the ADMIN_KEY
 * environment variable (set it in Vercel, ≥ 16 characters). Without that
 * variable the endpoint is disabled entirely.
 */
import { del, put } from '@vercel/blob'
import { error, json, rateLimited, readEntries, readJson, storageReady } from './_lib/http.js'

function authorised(request: Request): boolean {
  const expected = process.env.ADMIN_KEY ?? ''
  const given = request.headers.get('x-admin-key') ?? ''
  if (expected.length < 16 || given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i)
  return diff === 0
}

export async function GET(request: Request): Promise<Response> {
  if (rateLimited(request, 'admin', 30, 60_000)) return error('rate-limited', 429)
  if (!authorised(request)) return error('unauthorised', 401)
  if (!storageReady()) return error('storage-unavailable', 503)
  const [pending, published] = await Promise.all([readEntries('guestbook-pending/', 200), readEntries('guestbook/', 200)])
  return json({ pending, published }, 200, { 'Cache-Control': 'no-store' })
}

export async function POST(request: Request): Promise<Response> {
  if (rateLimited(request, 'admin', 60, 60_000)) return error('rate-limited', 429)
  if (!authorised(request)) return error('unauthorised', 401)
  if (!storageReady()) return error('storage-unavailable', 503)

  const body = await readJson<{ id?: string; action?: string }>(request)
  const id = body?.id ?? ''
  if (!/^msg_[a-z0-9]+_[a-f0-9]{8,32}$/.test(id)) return error('invalid-id', 400)

  const [pending, published] = await Promise.all([readEntries('guestbook-pending/', 1000), readEntries('guestbook/', 1000)])
  const inPending = pending.find((e) => e.id === id)
  const inPublished = published.find((e) => e.id === id)

  try {
    if (body?.action === 'approve' && inPending) {
      const { blobUrl, ...entry } = inPending
      await put(`guestbook/${id}.json`, JSON.stringify(entry), {
        access: 'public', contentType: 'application/json', addRandomSuffix: false, cacheControlMaxAge: 60,
      })
      await del(blobUrl)
      return json({ ok: true })
    }
    const target = body?.action === 'reject' ? inPending : body?.action === 'remove' ? inPublished : undefined
    if (target) {
      await del([target.blobUrl, ...(target.drawing ? [target.drawing] : [])])
      return json({ ok: true })
    }
    return error('not-found', 404)
  } catch (cause) {
    console.error('[api/moderate] failed', cause)
    return error('failed', 502)
  }
}
