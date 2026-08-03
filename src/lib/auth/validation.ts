import { z } from 'zod'

/** Case-insensitive email matching relies on every write going through this — there's no
 * database-level case-insensitive constraint (e.g. citext), so normalization has to be
 * consistent at every read/write site instead. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** No forced complexity rules (uppercase/symbol requirements) — length is the meaningful
 * signal for brute-force resistance; modern guidance (e.g. NIST 800-63B) favors this over
 * composition rules that mostly just push users toward predictable substitutions. */
export const registerInputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type RegisterInput = z.infer<typeof registerInputSchema>
