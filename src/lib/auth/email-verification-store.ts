import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { emailVerificationCodes } from '@/lib/db/schema'
import type { CodePurpose, VerificationCodesRepository, VerificationLocale, VerificationMailer } from './email-verification'

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

type EmailCopy = { subject: (code: string) => string; heading: string; body: string; footer: string }

const COPY: Record<CodePurpose, Record<VerificationLocale, EmailCopy>> = {
  verify: {
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
  },
  reset: {
    he: {
      subject: (code) => `${code} הוא הקוד לאיפוס הסיסמה ב-Check Please`,
      heading: 'איפוס הסיסמה',
      body: 'הקלידו את הקוד באפליקציה ובחרו סיסמה חדשה. הוא תקף ל-15 דקות.',
      footer: 'לא ביקשתם לאפס סיסמה? אפשר להתעלם מהמייל הזה, והסיסמה לא תשתנה.',
    },
    en: {
      subject: (code) => `${code} is your Check Please password reset code`,
      heading: 'Reset your password',
      body: 'Enter this code in the app and choose a new password. It works for 15 minutes.',
      footer: "Didn't ask to reset your password? You can ignore this email; nothing will change.",
    },
  },
}

const EXISTS_COPY: Record<
  VerificationLocale,
  { subject: string; heading: string; body: string; signInWith: string; action: string; footer: string }
> = {
  he: {
    subject: 'כבר יש לכם חשבון ב-Check Please',
    heading: 'כבר יש לכם חשבון',
    body: 'מישהו ניסה עכשיו ליצור חשבון חדש עם המייל הזה, אבל כבר יש לכם חשבון. אפשר פשוט להתחבר, ואם שכחתם את הסיסמה, לבחור "שכחתי סיסמה" במסך ההתחברות.',
    signInWith: 'מתחברים עם',
    action: 'מעבר ל-Check Please',
    footer: 'לא אתם ניסיתם להירשם? אפשר להתעלם מהמייל הזה. החשבון שלכם לא השתנה.',
  },
  en: {
    subject: 'You already have a Check Please account',
    heading: 'You already have an account',
    body: 'Someone just tried to create a new account with this email, but you already have one. Just sign in, and if you forgot your password, choose "Forgot password?" on the sign-in screen.',
    signInWith: 'Sign in with',
    action: 'Go to Check Please',
    footer: "Wasn't you? You can ignore this email. Your account hasn't changed.",
  },
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function renderHtml(locale: VerificationLocale, parts: { heading: string; body: string; centerpiece: string; footer: string }) {
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  return `<!doctype html><html lang="${locale}" dir="${dir}"><body style="margin:0;background:#fcfcfc;font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#1f1b16">
<div style="max-width:440px;margin:0 auto;padding:32px 24px;text-align:center">
<p style="margin:0 0 24px;font-size:15px;font-weight:600;color:#d9722f">Check Please</p>
<h1 style="margin:0 0 12px;font-size:20px">${parts.heading}</h1>
<p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#6b6358">${parts.body}</p>
${parts.centerpiece}
<p style="margin:0;font-size:12px;color:#9a9185">${parts.footer}</p>
</div></body></html>`
}

async function sendEmail(input: { to: string; subject: string; html: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [input.to], subject: input.subject, html: input.html, text: input.text }),
  })
  if (!response.ok) {
    throw new Error(`Resend rejected the email (${response.status}): ${await response.text().catch(() => '')}`)
  }
}

/** Sends through Resend's HTTP API; one request, so no SDK dependency. */
export const resendVerificationMailer: VerificationMailer = {
  async sendCode({ to, code, locale, purpose }) {
    const copy = COPY[purpose][locale]
    await sendEmail({
      to,
      subject: copy.subject(code),
      html: renderHtml(locale, {
        heading: copy.heading,
        body: copy.body,
        centerpiece: `<p dir="ltr" style="margin:0 0 24px;padding:16px;border-radius:16px;background:#f5efe7;font-size:32px;font-weight:700;letter-spacing:8px">${code}</p>`,
        footer: copy.footer,
      }),
      text: `${copy.heading}: ${code}\n\n${copy.body}\n\n${copy.footer}`,
    })
  },
  async sendAccountExists({ to, signInEmail, locale, appUrl }) {
    const copy = EXISTS_COPY[locale]
    const link = `${appUrl}/${locale}`
    await sendEmail({
      to,
      subject: copy.subject,
      html: renderHtml(locale, {
        heading: copy.heading,
        body: copy.body,
        centerpiece: `<p style="margin:0 0 6px;font-size:13px;color:#6b6358">${copy.signInWith}</p>
<p dir="ltr" style="margin:0 0 24px;font-size:16px;font-weight:600">${escapeHtml(signInEmail)}</p>
<p style="margin:0 0 24px"><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#d9722f;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">${copy.action}</a></p>`,
        footer: copy.footer,
      }),
      text: `${copy.heading}\n\n${copy.body}\n\n${copy.signInWith}: ${signInEmail}\n${link}\n\n${copy.footer}`,
    })
  },
}
