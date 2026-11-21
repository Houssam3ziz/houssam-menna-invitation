import { copy, del, list } from '@vercel/blob'
import { ACCESS, mediaUrl } from './http.js'

/**
 * Guest photo storage. Every upload lands in the PENDING area and is only
 * listed publicly after the couple approves it on /admin.html.
 *
 *   pending/guests/<day>/<id>.jpg  + pending/thumbs/…   (waiting, admin only)
 *   guests/<day>/<id>.jpg          + thumbs/…           (approved, public gallery)
 */
export const AREAS = {
  pending: { full: 'pending/guests/', thumb: 'pending/thumbs/' },
  approved: { full: 'guests/', thumb: 'thumbs/' },
} as const
export type Area = keyof typeof AREAS

export interface GuestPhoto {
  /** Pathname of the full photo, used as the id for admin actions. */
  id: string
  url: string
  /** ~480 px preview for the grid; the full photo loads only in the lightbox. */
  thumb: string
  createdAt: string
}

/** Photo ids are `<area full prefix><yyyy-mm-dd>/photo_<time>_<hex>.<ext>`. */
const KEY = /^\d{4}-\d{2}-\d{2}\/photo_[a-z0-9]+_[a-f0-9]{8,32}\.(jpg|png|webp)$/

/** Returns the area + key for a valid photo id, or null. */
export function parsePhotoId(id: string): { area: Area; key: string } | null {
  for (const area of Object.keys(AREAS) as Area[]) {
    const prefix = AREAS[area].full
    if (id.startsWith(prefix) && KEY.test(id.slice(prefix.length))) return { area, key: id.slice(prefix.length) }
  }
  return null
}

export async function listPhotos(area: Area, max = 600): Promise<GuestPhoto[]> {
  const { full, thumb } = AREAS[area]
  const thumbs = new Map<string, string>()
  let cursor: string | undefined
  do {
    const page = await list({ prefix: thumb, limit: 1000, cursor })
    for (const blob of page.blobs) thumbs.set(blob.pathname.slice(thumb.length), mediaUrl(blob.pathname))
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)

  const photos: GuestPhoto[] = []
  do {
    const page = await list({ prefix: full, limit: 1000, cursor })
    for (const blob of page.blobs) {
      photos.push({
        id: blob.pathname,
        url: mediaUrl(blob.pathname),
        thumb: thumbs.get(blob.pathname.slice(full.length)) ?? mediaUrl(blob.pathname),
        createdAt: new Date(blob.uploadedAt).toISOString(),
      })
    }
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor && photos.length < max)

  return photos.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, max)
}

const LONG_CACHE = 60 * 60 * 24 * 365

/** Moves a pending photo (and its thumbnail, if any) into the public gallery. */
export async function approvePhoto(key: string): Promise<void> {
  const { pending, approved } = AREAS
  const contentType = key.endsWith('.png') ? 'image/png' : key.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
  const opts = { access: ACCESS, contentType, addRandomSuffix: false, cacheControlMaxAge: LONG_CACHE }
  await copy(pending.full + key, approved.full + key, opts)
  const thumbCopied = await copy(pending.thumb + key, approved.thumb + key, { ...opts, contentType: 'image/jpeg' })
    .then(() => true)
    .catch(() => false) // older uploads may have no thumbnail
  await del([pending.full + key, ...(thumbCopied ? [pending.thumb + key] : [])])
}

/** Permanently deletes a photo (pending or approved) and its thumbnail. */
export async function deletePhoto(area: Area, key: string): Promise<void> {
  await del([AREAS[area].full + key, AREAS[area].thumb + key])
}
