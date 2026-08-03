import bcrypt from 'bcryptjs'

/** bcrypt's now-common modern minimum — a deliberate balance between brute-force resistance
 * and per-request latency on a serverless function. */
const SALT_ROUNDS = 12

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}
