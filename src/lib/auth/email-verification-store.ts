import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { emailVerificationCodes } from '@/lib/db/schema'
import type { VerificationCodesRepository, VerificationLocale, VerificationMailer } from './email-verification'

export const drizzleVerificationCodesRepository: VerificationCodesRepository = {
  async find(email) {
    const [row] = await db.select().from(emailVerificationCodes).where(eq(emailVerificationCodes.email, email)).limit(1)
    return row
  },
  async save(row) {
    await db
      .insert(emailVerificationCodes)
      .values(row)
      .onConflictDoUpdate({ target: emailVerificationCodes.email, set: { ...row } })
  },
  async incrementAttempts(email) {
    await db
      .update(emailVerificationCodes)
      .set({ attempts: sql`${emailVerificationCodes.attempts} + 1` })
      .where(eq(emailVerificationCodes.email, email))
  },
  async remove(email) {
    await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.email, email))
  },
}

const FROM = 'Check Please <noreply@tomergolan.dev>'

const COPY: Record<VerificationLocale, { subject: (code: string) => string; heading: string; body: string; footer: string }> = {
  he: {
    subject: (code) => `${code} הוא קוד האימות שלכם ל-Check Please`,
    heading: 'קוד האימות שלכם',
    body: 'הקלידו את הקוד באפליקציה כדי לסיים את ההרשמה. הוא תקף ל-15 דקות.',
    footer: 'לא נרשמתם ל-Check Please? אפשר להתעלם מהמייל הזה.',
  },
  en: {
    subject: (code) => `${code} is your Check Please verification code`,
    heading: 'Your verification code',
    body: 'Enter this code in the app to finish signing up. It works for 15 minutes.',
    footer: "Didn't sign up for Check Please? You can ignore this email.",
  },
}

function renderHtml(code: string, locale: VerificationLocale) {
  const copy = COPY[locale]
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  return `<!doctype html><html lang="${locale}" dir="${dir}"><body style="margin:0;background:#fcfcfc;font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#1f1b16">
<div style="max-width:440px;margin:0 auto;padding:32px 24px;text-align:center">
<p style="margin:0 0 24px;font-size:15px;font-weight:600;color:#d9722f">Check Please</p>
<h1 style="margin:0 0 12px;font-size:20px">${copy.heading}</h1>
<p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#6b6358">${copy.body}</p>
<p dir="ltr" style="margin:0 0 24px;padding:16px;border-radius:16px;background:#f5efe7;font-size:32px;font-weight:700;letter-spacing:8px">${code}</p>
<p style="margin:0;font-size:12px;color:#9a9185">${copy.footer}</p>
</div></body></html>`
}

/** Sends through Resend's HTTP API; one request, so no SDK dependency. */
export const resendVerificationMailer: VerificationMailer = {
  async sendCode({ to, code, locale }) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
    const copy = COPY[locale]
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: copy.subject(code),
        html: renderHtml(code, locale),
        text: `${copy.heading}: ${code}\n\n${copy.body}\n\n${copy.footer}`,
      }),
    })
    if (!response.ok) {
      throw new Error(`Resend rejected the email (${response.status}): ${await response.text().catch(() => '')}`)
    }
  },
}
