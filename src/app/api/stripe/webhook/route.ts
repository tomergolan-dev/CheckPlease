import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { findCreditPack } from '@/lib/credits/packs'
import { grantPurchase } from '@/lib/credits/grants'

export const runtime = 'nodejs'

/**
 * Credits are granted ONLY from this webhook, never from the client-side success redirect (see
 * Post-MVP Architecture in CLAUDE.md) — a spoofed or replayed redirect must never be able to
 * grant credits. Idempotent on the Checkout Session id via grantPurchase, so Stripe redelivering
 * the same event can never double-grant.
 */
export async function POST(request: Request) {
  const apiKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!apiKey || !webhookSecret) {
    console.error('stripe/webhook: STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  const rawBody = await request.text()
  const stripe = new Stripe(apiKey)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    console.error('stripe/webhook: signature verification failed', error)
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const checkoutSession = event.data.object
    const userId = checkoutSession.metadata?.userId
    const packType = checkoutSession.metadata?.packType

    if (!userId || !packType) {
      console.error('stripe/webhook: checkout.session.completed missing metadata', checkoutSession.id)
      return NextResponse.json({ received: true })
    }

    const pack = findCreditPack(packType)
    if (!pack) {
      console.error('stripe/webhook: unknown packType in metadata', packType)
      return NextResponse.json({ received: true })
    }

    await grantPurchase({
      userId,
      packType: pack.type,
      creditsGranted: pack.credits,
      amountPaidMinorUnits: pack.priceMinorUnits,
      currency: pack.currency,
      provider: 'stripe',
      providerRef: checkoutSession.id,
    })
  }

  return NextResponse.json({ received: true })
}
