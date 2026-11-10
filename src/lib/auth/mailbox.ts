import { sql, type SQL } from 'drizzle-orm'
import { users } from '@/lib/db/schema'

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com'])

/**
 * The real mailbox an address delivers to, so one inbox can't open several accounts (and collect
 * the free scans several times). Everything after a `+` is dropped for every provider, since the
 * common ones (Gmail, Outlook, iCloud, Fastmail) all deliver `name+anything@` to `name@`. Gmail also
 * ignores dots and treats googlemail.com as gmail.com.
 */
export function canonicalMailbox(email: string): string {
  const lower = email.trim().toLowerCase()
  const at = lower.lastIndexOf('@')
  if (at <= 0) return lower
  let local = lower.slice(0, at).split('+')[0]!
  let domain = lower.slice(at + 1)
  if (GMAIL_DOMAINS.has(domain)) {
    local = local.replaceAll('.', '')
    domain = 'gmail.com'
  }
  return `${local}@${domain}`
}

/**
 * `canonicalMailbox` of `users.email`, in SQL. It must stay identical to the function above. Computed per query rather than stored: the users table
 * is small, and registration is rare.
 */
export const canonicalMailboxSql: SQL<string> = sql<string>`(case
  when split_part(lower(${users.email}), '@', 2) in ('gmail.com', 'googlemail.com')
    then replace(split_part(split_part(lower(${users.email}), '@', 1), '+', 1), '.', '') || '@gmail.com'
  else split_part(split_part(lower(${users.email}), '@', 1), '+', 1) || '@' || split_part(lower(${users.email}), '@', 2)
end)`
