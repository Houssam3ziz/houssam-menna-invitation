# Hossam & Menna — Wedding Invitation

Static site (`index.html`, `style.css`, `script.js`, `assets/`) plus two Vercel Functions in `api/`.

## Edit the details
Everything lives in the `CONFIG` block at the top of `script.js` — date/time, venue, map query, timeline.

## Features
- Envelope opening, living hero, scratch-to-reveal date (day · month · year · time), timeline, countdown, location
- **Share Your Moments** — guests upload photos (resized + re-encoded to JPEG in the browser, which strips GPS)
- **Photo Gallery** — every guest photo, lightbox with keyboard + swipe
- **Leave Us a Message** — message board; guests can **type**, **write/draw with a finger** (or Apple Pencil / mouse), or both in one message
- Respects `prefers-reduced-motion`

## Backend (Vercel)
| Route | Purpose | Storage |
| --- | --- | --- |
| `GET/POST /api/photos` | list / upload guest photos (magic-byte checked, ≤ 4 MB) | Vercel Blob `guests/` |
| `GET/POST /api/guestbook` | list / post messages (text and/or handwritten PNG) | Vercel Blob `guestbook/`, `ink/` |
| `GET/POST /api/moderate` | approve / reject / remove messages (needs `x-admin-key`) | `guestbook-pending/` → `guestbook/` |

Spam protection on both write endpoints: per-IP rate limit, server-side honeypot, minimum time on the form,
size limits, file-signature checks. Photos also get a ~520 px thumbnail so the gallery stays light.

### Environment variables (Vercel → Settings → Environment Variables)
| Variable | Required | Purpose |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | yes — added automatically when you connect a Blob store | storage |
| `MODERATE_WISHES` | optional — `true` holds new messages until approved | moderation |
| `ADMIN_KEY` | optional — ≥ 16 random characters | unlocks `/admin.html` |

One-time setup: Vercel → Storage → create a **Blob** store → connect it to this project
(adds `BLOB_READ_WRITE_TOKEN` automatically — never commit it). Remove an item from Storage → Blob.

## Run locally
`npm run dev` serves the static site (photo/message features need `vercel dev` for the API).
`npm run check` type-checks the functions and syntax-checks `script.js`.
