import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { parseInputValueToMinorUnits } from '@/lib/money'

export const runtime = 'nodejs'

const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number]

/** Generous ceiling on the base64 payload — client-side compression keeps real uploads far below this. */
const MAX_BASE64_LENGTH = 12_000_000

const RECEIPT_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
        },
        required: ['name', 'price'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const

const EXTRACTION_PROMPT = `This image is a photo of a restaurant receipt or bill. Extract every distinct food or drink line item together with its price, in the language it's printed in (do not translate names).

Rules:
- Use each line's total price as printed (if a unit price and an extended/line total are both shown, use the line total, not the unit price).
- If the same dish name appears on more than one line, keep each occurrence as a separate entry — do not merge them.
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

  const { image, mediaType, currency } = (body ?? {}) as {
    image?: unknown
    mediaType?: unknown
    currency?: unknown
  }

  if (
    typeof image !== 'string' ||
    image.length === 0 ||
    image.length > MAX_BASE64_LENGTH ||
    !isSupportedMediaType(mediaType) ||
    typeof currency !== 'string'
  ) {
    return NextResponse.json({ error: 'invalid_image' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey })

  let response: Anthropic.Message
  try {
    response = await client.messages.create({
      model: 'claude-opus-5',
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
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }

  if (response.stop_reason === 'refusal') {
    return NextResponse.json({ error: 'refused' }, { status: 422 })
  }

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    console.error('scan-receipt: no text block in response', response)
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }

  let parsed: { items?: Array<{ name?: unknown; price?: unknown }> }
  try {
    parsed = JSON.parse(textBlock.text)
  } catch (error) {
    console.error('scan-receipt: failed to parse model output as JSON', error, textBlock.text)
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }

  const items = (parsed.items ?? [])
    .filter(
      (item): item is { name: string; price: number } =>
        typeof item.name === 'string' && item.name.trim().length > 0 && typeof item.price === 'number'
    )
    .map((item) => ({
      name: item.name.trim(),
      priceMinorUnits: parseInputValueToMinorUnits(String(item.price), currency),
    }))

  return NextResponse.json({ items })
}
