import { beforeEach, describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'
import { grantPurchase } from '@/lib/credits/grants'
import { POST } from './route'

vi.mock('@/lib/credits/grants', () => ({ grantPurchase: vi.fn() }))

const WEBHOOK_SECRET = 'whsec_test_secret'

function signedRequest(type: string, paymentStatus: string, secret = WEBHOOK_SECRET) {
  const payload = JSON.stringify({
    id: 'evt_1',
    object: 'event',
    type,
    data: {
      object: {
        id: 'cs_test_1',
        object: 'checkout.session',
        payment_status: paymentStatus,
        metadata: { userId: 'user-1', packType: 'pack_10' },
      },
    },
  })
  const signature = new Stripe('sk_test_fake').webhooks.generateTestHeaderString({ payload, secret })
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    body: payload,
  })
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.mocked(grantPurchase).mockReset()
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', WEBHOOK_SECRET)
  })

  it('grants credits for a completed, paid Checkout', async () => {
    const response = await POST(signedRequest('checkout.session.completed', 'paid'))

    expect(response.status).toBe(200)
    expect(grantPurchase).toHaveBeenCalledTimes(1)
    expect(grantPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', providerRef: 'cs_test_1', provider: 'stripe' })
    )
  })

  it('grants nothing for a completed Checkout that is not paid yet', async () => {
    const response = await POST(signedRequest('checkout.session.completed', 'unpaid'))

    expect(response.status).toBe(200)
    expect(grantPurchase).not.toHaveBeenCalled()
  })

  it('grants credits once a delayed payment succeeds', async () => {
    await POST(signedRequest('checkout.session.async_payment_succeeded', 'paid'))

    expect(grantPurchase).toHaveBeenCalledTimes(1)
  })

  it('grants nothing when a delayed payment fails', async () => {
    await POST(signedRequest('checkout.session.async_payment_failed', 'unpaid'))

    expect(grantPurchase).not.toHaveBeenCalled()
  })

  it('rejects a request with an invalid signature', async () => {
    const response = await POST(signedRequest('checkout.session.completed', 'paid', 'whsec_wrong'))

    expect(response.status).toBe(400)
    expect(grantPurchase).not.toHaveBeenCalled()
  })
})
