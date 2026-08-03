import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { auth } from '@/auth'
import { findCreditPack } from '@/lib/credits/packs'
import { purchaseInputSchema } from '@/lib/credits/validation'

export async function POST(request: Request) {
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) {
    console.error('credits/purchase: STRIPE_SECRET_KEY is not configured')
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const parsed = purchaseInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const pack = findCreditPack(parsed.data.packType)
  if (!pack) {
    return NextResponse.json({ error: 'invalid_pack' }, { status: 400 })
  }

  // Derived from the request itself, never a client-supplied value — trusting a client-passed
  // redirect target would be an open-redirect risk. The bare `/` target relies on the existing
  // next-intl proxy to redirect to the right locale exactly as it already does for any visit.
  const origin = new URL(request.url).origin

  const stripe = new Stripe(apiKey)

  let checkoutSession: Stripe.Checkout.Session
  try {
    checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: pack.currency.toLowerCase(),
            product_data: { name: `${pack.credits} scan credits` },
            unit_amount: pack.priceMinorUnits,
          },
          quantity: 1,
        },
      ],
      metadata: { userId: session.user.id, packType: pack.type },
      success_url: `${origin}/?purchase=success`,
      cancel_url: `${origin}/?purchase=cancelled`,
    })
  } catch (error) {
    console.error('credits/purchase: Stripe Checkout Session creation failed', error)
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }

  if (!checkoutSession.url) {
    console.error('credits/purchase: Checkout Session has no url', checkoutSession.id)
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }

  return NextResponse.json({ url: checkoutSession.url })
}
