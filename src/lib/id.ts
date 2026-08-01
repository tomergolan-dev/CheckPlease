/**
 * `crypto.randomUUID()` only exists in secure contexts (HTTPS or localhost) — loading the app
 * over plain HTTP on a LAN IP (e.g. testing on a phone during dev) leaves it undefined entirely.
 * `crypto.getRandomValues` has no such restriction, so it's the fallback rather than a second
 * secure-context-gated API.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
