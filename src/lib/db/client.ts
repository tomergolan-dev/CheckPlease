import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import ws from 'ws'
import * as schema from './schema'

/**
 * The Pool-based (WebSocket) Neon driver, not the HTTP driver — deliberately, even though
 * nothing in Phase 1 needs a transaction yet. The HTTP driver (drizzle-orm/neon-http) can only
 * run single, non-interactive queries: no `db.transaction(async (tx) => ...)` with application
 * logic between statements. The credit ledger (a later phase, see Post-MVP Architecture in
 * CLAUDE.md) needs exactly that — an atomic reserve-then-finalize-or-refund sequence with
 * concurrency-safe balance checks — so the connection mode is chosen now to not foreclose that,
 * rather than switching drivers under a future phase.
 */
neonConfig.webSocketConstructor = ws

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const db = drizzle({ client: pool, schema })
