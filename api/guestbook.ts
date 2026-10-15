/**
 * Wishes / guestbook.
 *
 *   GET  /api/guestbook → newest wishes first (max 60).
 *   POST /api/guestbook → { name, message } → the stored entry.
 *
 * Each wish is one small JSON file in Blob storage — no database to run.
 * React escapes everything it renders, and text is cleaned here as well.
 */
import { list, put } from '@vercel/blob'
import { SHORT_CDN_CACHE, cleanText, error, json, newId, readJson, storageReady } from './_lib/http.js'

const PREFIX = 'guestbook/'
const MAX_RETURNED = 60
const LIMITS = { name: 40, messageMin: 3, messageMax: 300 } as const

interface GuestbookEntry {
  id: string
  name: string
  message: string
  createdAt: string
}

export async function GET(): Promise<Response> {
  if (!storageReady()) return error('storage-unavailable', 503)

  try {
    const { blobs } = await list({ prefix: PREFIX, limit: 1000 })
    const newest = blobs
      .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))
      .slice(0, MAX_RETURNED)

    const entries = await Promise.all(
      newest.map(async (blob) => {
        try {
          const response = await fetch(blob.url)
          return response.ok ? ((await response.json()) as GuestbookEntry) : null
        } catch {
          return null
        }
      }),
    )

    return json(
      entries.filter((entry): entry is GuestbookEntry => entry !== null),
      200,
      { 'Cache-Control': SHORT_CDN_CACHE },
    )
  } catch (cause) {
    console.error('[api/guestbook] list failed', cause)
    return error('list-failed', 502)
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!storageReady()) return error('storage-unavailable', 503)

  const body = await readJson<{ name?: unknown; message?: unknown }>(request)
  if (!body) return error('bad-request', 400)

  const name = cleanText(body.name, LIMITS.name)
  const message = cleanText(body.message, LIMITS.messageMax)
  if (!name || message.length < LIMITS.messageMin) return error('invalid-input', 422)

  const entry: GuestbookEntry = {
    id: newId('msg'),
    name,
    message,
    createdAt: new Date().toISOString(),
  }

  try {
    await put(`${PREFIX}${entry.id}.json`, JSON.stringify(entry), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: true,
    })
    return json(entry, 201)
  } catch (cause) {
    console.error('[api/guestbook] write failed', cause)
    return error('write-failed', 502)
  }
}
