import Anthropic from '@anthropic-ai/sdk'
import { after, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { deleteOrphanedScanPhotos, isPhotoStorageConfigured, saveScanPhoto } from '@/lib/scans/photos'
import { blobPhotoStorage, drizzleScanPhotosRepository } from '@/lib/scans/photo-storage'
import { parseInputValueToMinorUnits } from '@/lib/money'
import { reserveCredit, refundCredit } from '@/lib/credits/reserve'
import { hasUnlimitedCredits } from '@/lib/credits/dev-override'
import { beginScanAttempt, type ScanAttemptStatus } from '@/lib/scans/limits'
import { drizzleScanAttemptsRepository } from '@/lib/scans/repository'

export const runtime = 'nodejs'

const SCAN_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number]

/** Generous ceiling on the base64 payload — client-side compression keeps real uploads far below this. */
const MAX_BASE64_LENGTH = 12_000_000

/**
 * Sonnet 5.5 at high effort. Haiku 4.5 was too unreliable on real receipt photos, and Sonnet 5 at
 * medium effort misread wrapped dish names and shifted numbers between rows. On a real receipt with
 * a dish name wrapping onto a second line (2026-11-11), Sonnet 5 / medium read it wrong 5 times out
 * of 5; Sonnet 5.5 / high with the table-reading prompt below read it right 11 out of 11, in about
 * 3 seconds, at the same per-token price. Opus 5.5 did no better there at twice the price.
 */
const MODEL = 'claude-sonnet-5-5'

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

How to read it:
- Read the item area as a table. First find its column headers (for example שם פריט / יחידות / מחיר / סה"כ, or Item / Qty / Price / Total) and note where each column sits horizontally. Then give every number to the column it lines up under: a count in the quantity column is a quantity, an amount in the price or total column is a price. Never guess a number's role from its size alone. Hebrew receipts read right to left, so the name is usually on the right and the amounts on the left.
- A dish name can wrap onto a second printed line. A line that has text but no quantity and no price of its own is almost always the rest of the dish name on the line above it; join the two into one name (e.g. "סלט קיסר" + "עם חזה עוף" → "סלט קיסר עם חזה עוף"). Don't make it a separate item, and don't move the next line's numbers up to it: each line's quantity and prices belong to the row they're printed on.
- Photos may be dim, angled or partly shadowed. Take extra care on faint digits rather than guessing.

Rules:
- "price" is always the line's total price as printed — if a unit price and an extended/line total are both shown, use the line total, not the unit price.
- "quantity" is how many units that price covers. If a line shows an explicit quantity or multiplier for one dish (e.g. "2x", "×2", a quantity column) together with a single combined price, report that quantity together with the combined price — do not split it into repeated entries.
- If the same dish appears on separate, non-multiplied lines (e.g. two distinct order lines for the same dish with no ×N shown), keep each line as its own entry with quantity 1 rather than merging them.
- If no quantity is shown on a line, use quantity 1.
- Read every digit carefully — double-check that each price and quantity you output matches exactly what's printed, including the decimal point. Misreading a digit is worse than leaving an item out.
- Exclude subtotal, tax/VAT, service charge, tip, discount, payment method, and grand-total lines.
- Exclude table numbers, dates, receipt/order numbers, and any other non-item metadata.
- Before answering, check your work: if the receipt prints a total of the items (e.g. סה"כ, פריטים לתשלום, Subtotal, Total), your line prices should add up to it. If they don't, re-read the lines, the columns and any wrapped names until they do, or until you're sure the receipt itself differs.
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
    !SCAN_ID_PATTERN.test(scanId)
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

  const attempt = await beginScanAttempt(
    { scanId, userId, exempt: bypassCredits },
    drizzleScanAttemptsRepository
  )
  if (!attempt.ok) {
    if (attempt.reason === 'duplicate') {
      return NextResponse.json({ error: 'duplicate_scan' }, { status: 409 })
    }
    return NextResponse.json({ error: attempt.reason }, { status: 429 })
  }

  // Captured as a freshly-typed const so the closures below keep the `string` narrowing already
  // established above — TS drops flow-narrowing for outer-scope values referenced inside a
  // nested function.
  const validatedScanId: string = scanId

  // Bookkeeping only: a failed write here must never cost the user a scan that already worked.
  async function finish(status: ScanAttemptStatus, usage?: Anthropic.Usage) {
    try {
      await drizzleScanAttemptsRepository.finishAttempt(
        validatedScanId,
        status,
        usage && { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens }
      )
    } catch (error) {
      console.error('scan-receipt: failed to record scan outcome', error)
    }
  }

  async function maybeRefund() {
    if (!bypassCredits) await refundCredit(userId, validatedScanId)
  }

  if (!bypassCredits) {
    const reserved = await reserveCredit(userId, scanId)
    if (!reserved.ok) {
      await finish('no_credits')
      return NextResponse.json({ error: 'insufficient_credits' }, { status: 402 })
    }
  }

  const client = new Anthropic({ apiKey })

  let response: Anthropic.Message
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      output_config: {
        effort: 'high',
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
    await finish('failed')
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }

  if (response.stop_reason === 'refusal') {
    await maybeRefund()
    await finish('failed', response.usage)
    return NextResponse.json({ error: 'refused' }, { status: 422 })
  }

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    console.error('scan-receipt: no text block in response', response)
    await maybeRefund()
    await finish('failed', response.usage)
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }

  let parsed: { items?: Array<{ name?: unknown; quantity?: unknown; price?: unknown }> }
  try {
    parsed = JSON.parse(textBlock.text)
  } catch (error) {
    console.error('scan-receipt: failed to parse model output as JSON', error, textBlock.text)
    await maybeRefund()
    await finish('failed', response.usage)
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

  await finish(items.length === 0 ? 'empty' : 'succeeded', response.usage)

  // After the response, so saving the photo never slows the scan down. Best-effort: a failed save
  // only means this bill has no photo to show, never a failed scan.
  if (isPhotoStorageConfigured()) {
    after(async () => {
      try {
        if (items.length > 0) {
          await saveScanPhoto(
            { userId, scanId: validatedScanId, imageBase64: image, contentType: mediaType },
            blobPhotoStorage,
            drizzleScanPhotosRepository
          )
        }
        await deleteOrphanedScanPhotos(new Date(), blobPhotoStorage, drizzleScanPhotosRepository)
      } catch (error) {
        console.error('scan-receipt: bill photo bookkeeping failed', error)
      }
    })
  }

  return NextResponse.json({ items })
}
