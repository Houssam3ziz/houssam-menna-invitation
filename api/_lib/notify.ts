/**
 * Email notifications to the couple, sent through Resend's HTTP API
 * (https://resend.com — no SDK needed).
 *
 * Environment variables (Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY  required to send; without it notifications are skipped.
 *   NOTIFY_EMAIL    where notifications go (comma-separated for several).
 *   NOTIFY_FROM     optional sender. Defaults to Resend's shared test sender,
 *                   which can only deliver to the email the Resend account
 *                   was created with — verify a domain to send anywhere.
 *
 * Notifications are best effort: a failure is logged and never fails the
 * guest's request.
 */

const DEFAULT_FROM = 'Houssam & Menna <onboarding@resend.dev>'
const SITE_URL = (process.env.SITE_URL ?? '').replace(/\/$/, '')

export interface Notice {
  subject: string
  /** Plain-text lines; each becomes a paragraph in the HTML version. */
  lines: string[]
  /** Optional image URLs (already validated by the caller) shown as previews. */
  images?: string[]
  /** Guest's email, used as Reply-To when given. */
  replyTo?: string
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)

function render({ subject, lines, images = [] }: Notice): { html: string; text: string } {
  const admin = SITE_URL ? `${SITE_URL}/admin.html` : ''
  const text = [...lines, ...images, '', admin && `Admin: ${admin}`].filter((l) => l !== '').join('\n')
  const html = `<!doctype html><html><body style="margin:0;background:#fdfbf7;font-family:Georgia,serif;color:#5f4b30">
  <div style="max-width:520px;margin:0 auto;padding:28px 20px">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#b8894a">Houssam &amp; Menna · 16 · 12 · 2026</p>
    <h1 style="margin:0 0 18px;font-weight:400;font-size:24px;color:#7a5a26">${escapeHtml(subject)}</h1>
    <div style="background:#fff;border:1px solid #efe4cc;border-radius:14px;padding:16px 18px;font-size:16px;line-height:1.55">
      ${lines.map((l) => `<p style="margin:0 0 8px;white-space:pre-wrap">${escapeHtml(l)}</p>`).join('')}
      ${images
        .map((src) => `<img src="${escapeHtml(src)}" alt="" style="display:block;max-width:100%;max-height:320px;border-radius:10px;margin:10px 0">`)
        .join('')}
    </div>
    ${admin ? `<p style="margin:18px 0 0;font-size:14px"><a href="${escapeHtml(admin)}" style="color:#7a5a26">Open the admin page →</a></p>` : ''}
  </div></body></html>`
  return { html, text }
}

export async function notify(notice: Notice): Promise<void> {
  const key = process.env.RESEND_API_KEY
  const to = (process.env.NOTIFY_EMAIL ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (!key || to.length === 0) {
    console.warn('[notify] skipped — RESEND_API_KEY or NOTIFY_EMAIL is not set')
    return
  }
  const { html, text } = render(notice)
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM || DEFAULT_FROM,
        to,
        subject: notice.subject,
        html,
        text,
        ...(notice.replyTo ? { reply_to: notice.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(6000),
    })
    if (!r.ok) console.error('[notify] Resend rejected the email', r.status, (await r.text()).slice(0, 300))
  } catch (cause) {
    console.error('[notify] send failed', cause)
  }
}
