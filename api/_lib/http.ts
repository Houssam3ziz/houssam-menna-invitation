import { get, list } from '@vercel/blob'

/**
 * Small helpers shared by the Vercel Functions in /api.
 * Files under a leading-underscore folder are never exposed as routes.
 */

export const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' } as const

/** Cached at the CDN for a few seconds so a busy wedding night stays cheap. */
export const SHORT_CDN_CACHE = 'public, max-age=0, s-maxage=15, stale-while-revalidate=45'

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } })
}

export function error(message: string, status: number): Response {
  return json({ message }, status, { 'Cache-Control': 'no-store' })
}

/** Reads a JSON body without ever throwing; oversized bodies are rejected. */
export async function readJson<T>(request: Request, maxBytes = 8_192): Promise<T | null> {
  const declared = Number(request.headers.get('content-length') ?? '0')
  if (declared > maxBytes) return null
  try {
    const text = await request.text()
    if (text.length > maxBytes) return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

/** Strips control characters, collapses runaway whitespace and trims. */
export function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  let out = ''
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    out += code < 32 || code === 127 ? ' ' : char
  }
  return out.replace(/\s{3,}/g, '  ').trim().slice(0, maxLength)
}

/** Sortable, collision-safe id: time prefix + random tail. */
export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`
}

/** Fails fast (and loudly in logs) when the Blob store is not connected. */
export function storageReady(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true
  console.error('[api] BLOB_READ_WRITE_TOKEN is missing — connect a Blob store to this project.')
  return false
}

/**
 * Best-effort per-IP rate limit. State lives in the warm function instance,
 * so it is a speed bump for bursts and scripts, not a hard guarantee.
 */
const hits = new Map<string, number[]>()
export function rateLimited(request: Request, key: string, limit: number, windowMs: number): boolean {
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown'
  const id = `${key}:${ip}`
  const now = Date.now()
  const recent = (hits.get(id) ?? []).filter((t) => now - t < windowMs)
  recent.push(now)
  hits.set(id, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > limit
}

/** Identifies image bytes by their signature, never by a client-supplied type. */
export function sniffImage(bytes: Uint8Array): { type: string; ext: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { type: 'image/png', ext: 'png' }
  const riff = String.fromCharCode(...bytes.slice(0, 4))
  const webp = String.fromCharCode(...bytes.slice(8, 12))
  if (riff === 'RIFF' && webp === 'WEBP') return { type: 'image/webp', ext: 'webp' }
  return null
}

/** Constant-time check of the `x-admin-key` header against ADMIN_KEY (≥ 16 chars, else disabled). */
export function adminAuthorised(request: Request): boolean {
  const expected = process.env.ADMIN_KEY ?? ''
  const given = request.headers.get('x-admin-key') ?? ''
  if (expected.length < 16 || given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i)
  return diff === 0
}

/**
 * The Blob store is PRIVATE: nothing in it has a public URL. Files reach the
 * browser only through /api/media, which streams an allow-listed pathname.
 */
export const ACCESS = 'private' as const
export const MEDIA_PREFIXES = ['guests/', 'thumbs/', 'ink/', 'pending/guests/', 'pending/thumbs/'] as const
export const mediaUrl = (pathname: string): string => `/api/media?p=${encodeURIComponent(pathname)}`

/** Reads a private JSON blob by pathname, bypassing the CDN so edits show at once. */
export async function readJsonBlob<T>(pathname: string): Promise<T | null> {
  const res = await get(pathname, { access: ACCESS, useCache: false })
  if (!res || res.statusCode !== 200) return null
  return (await new Response(res.stream).json()) as T
}


export interface GuestbookEntry {
  id: string
  name: string
  message: string
  drawing?: string
  createdAt: string
}

export async function readEntries(prefix: string, max = 80): Promise<Array<GuestbookEntry & { pathname: string }>> {
  const { blobs } = await list({ prefix, limit: 1000 })
  const newest = blobs
    .filter((b) => b.pathname.endsWith('.json'))
    .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))
    .slice(0, max)
  const entries = await Promise.all(
    newest.map(async (blob) => {
      try {
        const entry = await readJsonBlob<GuestbookEntry>(blob.pathname)
        return entry ? { ...entry, pathname: blob.pathname } : null
      } catch {
        return null
      }
    }),
  )
  return entries.filter((e): e is GuestbookEntry & { pathname: string } => e !== null)
}

