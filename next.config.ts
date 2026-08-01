import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  // Lets the dev server be reached from other devices on the LAN (e.g. testing on a phone) —
  // Next.js blocks cross-origin dev requests by default for safety.
  allowedDevOrigins: ['10.100.102.69'],
}

export default withNextIntl(nextConfig)
