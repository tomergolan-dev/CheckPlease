import { beforeEach, describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'
import { auth } from '@/auth'
import { POST } from './route'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

const createSession = vi.fn()
vi.mock('stripe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('stripe')>()
  const Real = actual.default
  function FakeStripe() {
    return { checkout: { sessions: { create: createSession } } }
  }
  FakeStripe.errors = Real.errors
  return { default: FakeStripe }
})

function buyRequest() {
  return new Request('http://localhost/api/credits/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packType: 'pack_10' }),
  })
}

describe('POST /api/credits/purchase', () => {
  beforeEach(() => {
    createSession.mockReset()
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake')
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1' },
      expires: '2099-01-01',
    } as never)
  })

  it('returns the Checkout url', async () => {
    createSession.mockResolvedValue({ url: 'https://checkout.stripe.com/x' })
    const response = await POST(buyRequest())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      url: 'https://checkout.stripe.com/x',
    })
  })

  it('says payments are unavailable when no key is configured', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    const response = await POST(buyRequest())
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'payments_unavailable' })
  })

  it('says payments are unavailable when Stripe rejects the key', async () => {
    createSession.mockRejectedValue(
      new Stripe.errors.StripeAuthenticationError({
        message: 'Expired API Key',
      } as never)
    )
    const response = await POST(buyRequest())
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'payments_unavailable' })
  })

  it('asks to retry when Stripe is briefly unreachable', async () => {
    createSession.mockRejectedValue(new Stripe.errors.StripeConnectionError({ message: 'timeout' } as never))
    const response = await POST(buyRequest())
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: 'upstream_error' })
  })
})
