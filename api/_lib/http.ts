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
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`
}

/** Fails fast (and loudly in logs) when the Blob store is not connected. */
export function storageReady(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true
  console.error('[api] BLOB_READ_WRITE_TOKEN is missing — connect a Blob store to this project.')
  return false
}
