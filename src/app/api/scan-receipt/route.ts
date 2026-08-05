import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { parseInputValueToMinorUnits } from '@/lib/money'
import { reserveCredit, refundCredit } from '@/lib/credits/reserve'
import { hasUnlimitedCredits } from '@/lib/credits/dev-override'

export const runtime = 'nodejs'

const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number]

/** Generous ceiling on the base64 payload — client-side compression keeps real uploads far below this. */
const MAX_BASE64_LENGTH = 12_000_000

/**
 * Haiku 4.5 (the cheapest tier) proved too unreliable on real receipt photos in testing — too many
 * misread names/prices. Sonnet 5 is the accuracy/cost middle ground: much stronger OCR-style vision
 * than Haiku, still a fraction of Opus 5's price (and has introductory pricing through 2026-08-31).
 * 'claude-opus-5' remains a one-line upgrade if Sonnet 5 still isn't accurate enough in practice.
 */
const MODEL = 'claude-sonnet-5'

const RECEIPT_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          quantity: { type: 'integer' },
          price: { type: 'number' },
        },
        required: ['name', 'quantity', 'price'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const

const EXTRACTION_PROMPT = `This image is a photo of a restaurant receipt or bill. Extract every distinct food or drink line item together with its quantity and price, in the language it's printed in (do not translate names).

Rules:
- "price" is always the line's total price as printed — if a unit price and an extended/line total are both shown, use the line total, not the unit price.
- "quantity" is how many units that price covers. If a line shows an explicit quantity or multiplier for one dish (e.g. "2x", "×2", a quantity column) together with a single combined price, report that quantity together with the combined price — do not split it into repeated entries.
- If the same dish appears on separate, non-multiplied lines (e.g. two distinct order lines for the same dish with no ×N shown), keep each line as its own entry with quantity 1 rather than merging them.
- If no quantity is shown on a line, use quantity 1.
- Read every digit carefully — double-check that each price and quantity you output matches exactly what's printed, including the decimal point. Misreading a digit is worse than leaving an item out.
- Exclude subtotal, tax/VAT, service charge, tip, discount, payment method, and grand-total lines.
- Exclude table numbers, dates, receipt/order numbers, and any other non-item metadata.
- If the photo is unreadable or you cannot confidently identify any items, return an empty items array rather than guessing.`

function isSupportedMediaType(value: unknown): value is SupportedMediaType {
  return typeof value === 'string' && (SUPPORTED_MEDIA_TYPES as readonly string[]).includes(value)
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('scan-receipt: ANTHROPIC_API_KEY is not configured')
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_image' }, { status: 400 })
  }

  const { image, mediaType, currency, scanId } = (body ?? {}) as {
    image?: unknown
    mediaType?: unknown
    currency?: unknown
    scanId?: unknown
  }

  if (
    typeof image !== 'string' ||
    image.length === 0 ||
    image.length > MAX_BASE64_LENGTH ||
    !isSupportedMediaType(mediaType) ||
    typeof currency !== 'string' ||
    typeof scanId !== 'string' ||
    scanId.length === 0
  ) {
    return NextResponse.json({ error: 'invalid_image' }, { status: 400 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  // Dev/demo-only allowlist override — see src/lib/credits/dev-override.ts. Disabled unless
  // UNLIMITED_CREDITS_EMAILS is set; an allowlisted user's scans skip the ledger entirely rather
  // than reserving/refunding, so this never touches real credit accounting either way.
  const bypassCredits = hasUnlimitedCredits(session.user.email)

  if (!bypassCredits) {
    const reserved = await reserveCredit(userId, scanId)
    if (!reserved.ok) {
      return NextResponse.json({ error: 'insufficient_credits' }, { status: 402 })
    }
  }

  // Captured as a freshly-typed const so the closure below keeps the `string` narrowing already
  // established above — TS drops flow-narrowing for outer-scope values referenced inside a
  // nested function.
  const validatedScanId: string = scanId

  async function maybeRefund() {
    if (!bypassCredits) await refundCredit(userId, validatedScanId)
  }

  const client = new Anthropic({ apiKey })

  let response: Anthropic.Message
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: RECEIPT_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        },
      ],
    })
  } catch (error) {
    console.error('scan-receipt: Anthropic request failed', error)
    await maybeRefund()
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }

  if (response.stop_reason === 'refusal') {
    await maybeRefund()
    return NextResponse.json({ error: 'refused' }, { status: 422 })
  }

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    console.error('scan-receipt: no text block in response', response)
    await maybeRefund()
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }

  let parsed: { items?: Array<{ name?: unknown; quantity?: unknown; price?: unknown }> }
  try {
    parsed = JSON.parse(textBlock.text)
  } catch (error) {
    console.error('scan-receipt: failed to parse model output as JSON', error, textBlock.text)
    await maybeRefund()
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }

  const items = (parsed.items ?? [])
    .filter(
      (item): item is { name: string; quantity?: unknown; price: number } =>
        typeof item.name === 'string' && item.name.trim().length > 0 && typeof item.price === 'number'
    )
    .map((item) => {
      const quantity = Math.max(1, Math.round(typeof item.quantity === 'number' ? item.quantity : 1))
      const lineTotalMinorUnits = parseInputValueToMinorUnits(String(item.price), currency)
      return {
        name: item.name.trim(),
        quantity,
        // The line total is what's printed and least ambiguous for the model to read; the app's
        // Item model stores unit price × quantity, so divide here rather than asking the model to.
        unitPriceMinorUnits: Math.round(lineTotalMinorUnits / quantity),
      }
    })

  if (items.length === 0) {
    // No usable result — the reservation from reserveCredit is only ever final on a usable
    // outcome (see Post-MVP Architecture in CLAUDE.md), so this counts as a refundable failure
    // even though it's still a 200 response — the client already treats an empty array as its
    // own "no items found" state, no response-shape change needed here.
    await maybeRefund()
  }

  return NextResponse.json({ items })
}
