# Hossam & Menna — Wedding Invitation

Static site (`index.html`, `style.css`, `script.js`, `assets/`) plus two Vercel Functions in `api/`.

## Edit the details
Everything lives in the `CONFIG` block at the top of `script.js` — date/time, venue, map query, timeline.

## Features
- Envelope opening, living hero, scratch-to-reveal date (day · month · year · time), timeline, countdown, location
- **Share Your Moments** — guests upload photos (resized + re-encoded to JPEG in the browser, which strips GPS)
- **Photo Gallery** — every guest photo, lightbox with keyboard + swipe
- **Leave Us a Message** — message board
- Respects `prefers-reduced-motion`

## Backend (Vercel)
| Route | Purpose | Storage |
| --- | --- | --- |
| `GET/POST /api/photos` | list / upload guest photos (magic-byte checked, ≤ 4 MB) | Vercel Blob `guests/` |
| `GET/POST /api/guestbook` | list / post messages | Vercel Blob `guestbook/` |

One-time setup: Vercel → Storage → create a **Blob** store → connect it to this project
(adds `BLOB_READ_WRITE_TOKEN` automatically — never commit it). Remove an item from Storage → Blob.

## Run locally
`npm run dev` serves the static site (photo/message features need `vercel dev` for the API).
`npm run check` type-checks the functions and syntax-checks `script.js`.
