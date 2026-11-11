import { z } from 'zod'
import type { VerificationLocale } from './email-verification'

const emailSchema = z.string().trim().toLowerCase().pipe(z.email())
const localeSchema = z.enum(['he', 'en']).catch('he')

export const sendCodeRequestSchema = z.object({ email: emailSchema, locale: localeSchema })
export const verifyEmailRequestSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
})

export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
  password: z.string().min(8),
})

export function localeFrom(value: unknown): VerificationLocale {
  return localeSchema.parse(value)
}
