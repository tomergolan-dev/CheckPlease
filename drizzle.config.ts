import { defineConfig } from 'drizzle-kit'

// `dbCredentials` is only read by commands that actually connect (`migrate`, `push`, `studio`)
// — `generate` diffs the schema file offline and never touches it. Falling back to an empty
// string (rather than throwing here) lets `generate` run without DATABASE_URL set; a connecting
// command with no real URL fails on its own with a clear connection error at that point.
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
})
