import { describe, expect, it } from 'vitest'
import { createInMemoryCreditsRepository } from './test-helpers'
import { reserveCredit, refundCredit } from './reserve'
import { grantSignupBonus, grantPurchase, SIGNUP_BONUS_CREDITS } from './grants'

describe('reserveCredit / refundCredit', () => {
  it('reserves a credit, decrementing the balance by 1', async () => {
    const { repository, getLedgerEntries } = createInMemoryCreditsRepository()
    await grantSignupBonus('u1', repository)

    const result = await reserveCredit('u1', 'scan-1', repository)

    expect(result).toEqual({ ok: true, balance: SIGNUP_BONUS_CREDITS - 1 })
    expect(getLedgerEntries()).toContainEqual({
      userId: 'u1',
      type: 'consumption',
      amount: -1,
      idempotencyKey: 'consumption:scan-1',
    })
  })

  it('returns insufficient_credits when the balance is 0', async () => {
    const { repository } = createInMemoryCreditsRepository()
    // No signup bonus granted — balance starts at 0.
    const result = await reserveCredit('u1', 'scan-1', repository)
    expect(result).toEqual({ ok: false, reason: 'insufficient_credits' })
  })

  it('refunds a reserved credit, restoring the balance', async () => {
    const { repository } = createInMemoryCreditsRepository()
    await grantSignupBonus('u1', repository)
    await reserveCredit('u1', 'scan-1', repository)

    const result = await refundCredit('u1', 'scan-1', repository)

    expect(result).toEqual({ ok: true, balance: SIGNUP_BONUS_CREDITS })
  })

  it('a given scanId can never deduct twice — sequential retry', async () => {
    const { repository, getLedgerEntries } = createInMemoryCreditsRepository()
    await grantSignupBonus('u1', repository)

    const first = await reserveCredit('u1', 'scan-1', repository)
    const second = await reserveCredit('u1', 'scan-1', repository)

    expect(first).toEqual({ ok: true, balance: SIGNUP_BONUS_CREDITS - 1 })
    expect(second).toEqual({ ok: true, balance: SIGNUP_BONUS_CREDITS - 1 })
    expect(getLedgerEntries().filter((e) => e.idempotencyKey === 'consumption:scan-1')).toHaveLength(1)
  })

  it('a given scanId can never deduct twice — concurrent retry', async () => {
    const { repository, getLedgerEntries } = createInMemoryCreditsRepository()
    await grantSignupBonus('u1', repository)

    const [first, second] = await Promise.all([
      reserveCredit('u1', 'scan-1', repository),
      reserveCredit('u1', 'scan-1', repository),
    ])

    expect(first).toEqual({ ok: true, balance: SIGNUP_BONUS_CREDITS - 1 })
    expect(second).toEqual({ ok: true, balance: SIGNUP_BONUS_CREDITS - 1 })
    expect(getLedgerEntries().filter((e) => e.idempotencyKey === 'consumption:scan-1')).toHaveLength(1)
  })

  it('a duplicate refund for an already-refunded scan is a safe no-op', async () => {
    const { repository, getLedgerEntries } = createInMemoryCreditsRepository()
    await grantSignupBonus('u1', repository)
    await reserveCredit('u1', 'scan-1', repository)

    const first = await refundCredit('u1', 'scan-1', repository)
    const second = await refundCredit('u1', 'scan-1', repository)

    expect(first).toEqual({ ok: true, balance: SIGNUP_BONUS_CREDITS })
    expect(second).toEqual({ ok: true, balance: SIGNUP_BONUS_CREDITS })
    expect(getLedgerEntries().filter((e) => e.idempotencyKey === 'refund:scan-1')).toHaveLength(1)
  })

  it('concurrent consumption never pushes the balance negative', async () => {
    const { repository, getLedgerEntries } = createInMemoryCreditsRepository()
    // Seed a balance of exactly 5 via 5 promo grants, one credit each, to avoid depending on
    // SIGNUP_BONUS_CREDITS's exact value for this test's arithmetic.
    for (let i = 0; i < 5; i++) {
      await repository.applyLedgerEntry({
        userId: 'u1',
        type: 'promo',
        amount: 1,
        idempotencyKey: `seed:${i}`,
      })
    }

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => reserveCredit('u1', `scan-${i}`, repository))
    )

    const succeeded = results.filter((r) => r.ok)
    const failed = results.filter((r) => !r.ok)
    expect(succeeded).toHaveLength(5)
    expect(failed).toHaveLength(5)
    expect(await repository.getBalance('u1')).toBe(0)
    expect(getLedgerEntries().filter((e) => e.type === 'consumption')).toHaveLength(5)
  })

  it('balance always equals the sum of ledger entries, across a mixed operation sequence', async () => {
    const { repository, getLedgerEntries } = createInMemoryCreditsRepository()

    await grantSignupBonus('u1', repository)
    await reserveCredit('u1', 'scan-1', repository)
    await reserveCredit('u1', 'scan-2', repository)
    await refundCredit('u1', 'scan-1', repository)
    await reserveCredit('u1', 'scan-3', repository)
    await grantPurchase(
      {
        userId: 'u1',
        packType: 'pack_10',
        creditsGranted: 10,
        amountPaidMinorUnits: 790,
        currency: 'ILS',
        provider: 'stripe',
        providerRef: 'cs_test_1',
      },
      repository
    )
    await reserveCredit('u1', 'scan-4', repository)

    const balance = await repository.getBalance('u1')
    const sumOfLedger = getLedgerEntries()
      .filter((e) => e.userId === 'u1')
      .reduce((total, entry) => total + entry.amount, 0)

    expect(balance).toBe(sumOfLedger)
  })
})

describe('grantSignupBonus', () => {
  it('grants exactly SIGNUP_BONUS_CREDITS once', async () => {
    const { repository } = createInMemoryCreditsRepository()
    await grantSignupBonus('u1', repository)
    expect(await repository.getBalance('u1')).toBe(SIGNUP_BONUS_CREDITS)
  })

  it('is idempotent — calling it twice for the same user only grants once', async () => {
    const { repository, getLedgerEntries } = createInMemoryCreditsRepository()
    await grantSignupBonus('u1', repository)
    await grantSignupBonus('u1', repository)

    expect(await repository.getBalance('u1')).toBe(SIGNUP_BONUS_CREDITS)
    expect(getLedgerEntries().filter((e) => e.type === 'signup_bonus')).toHaveLength(1)
  })
})

describe('grantPurchase', () => {
  const pack = {
    userId: 'u1',
    packType: 'pack_25',
    creditsGranted: 25,
    amountPaidMinorUnits: 1690,
    currency: 'ILS',
    provider: 'stripe',
    providerRef: 'cs_test_dup',
  } as const

  it('grants the pack credits', async () => {
    const { repository } = createInMemoryCreditsRepository()
    const result = await grantPurchase(pack, repository)
    expect(result).toEqual({ granted: true, balance: 25 })
  })

  it('is idempotent on providerRef — a webhook redelivery is a safe no-op', async () => {
    const { repository, getLedgerEntries } = createInMemoryCreditsRepository()
    const first = await grantPurchase(pack, repository)
    const second = await grantPurchase(pack, repository)

    expect(first).toEqual({ granted: true, balance: 25 })
    expect(second).toEqual({ granted: false, balance: 25 })
    expect(getLedgerEntries().filter((e) => e.type === 'purchase')).toHaveLength(1)
  })
})
