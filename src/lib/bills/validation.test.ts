import { describe, expect, it } from 'vitest'
import { billDataSchema, renameRequestSchema } from './validation'

function validBill() {
  return {
    id: 'bill-1',
    createdAt: 1000,
    updatedAt: 1000,
    currency: 'ILS',
    roundUpPayments: false,
    nextDinerColorIndex: 2,
    diners: [
      { id: 'd1', partySize: 1, color: 'blue' },
      { id: 'd2', name: 'Dana', partySize: 2, color: 'green' },
    ],
    items: [
      {
        id: 'i1',
        name: 'Burger',
        unitPriceMinorUnits: 4500,
        quantity: 1,
        sharedBy: ['d1', 'd2'],
        source: 'manual',
        sortIndex: 0,
      },
    ],
    tip: { mode: 'percentage', valueBasisPoints: 1200 },
  }
}

describe('billDataSchema', () => {
  it('accepts a well-formed bill', () => {
    const result = billDataSchema.safeParse(validBill())
    expect(result.success).toBe(true)
  })

  it('accepts status present or absent', () => {
    expect(billDataSchema.safeParse({ ...validBill(), status: 'draft' }).success).toBe(true)
    expect(billDataSchema.safeParse({ ...validBill(), status: 'completed' }).success).toBe(true)
    expect(billDataSchema.safeParse(validBill()).success).toBe(true)
  })

  it('rejects an unknown diner color token', () => {
    const bill = validBill()
    bill.diners[0]!.color = 'chartreuse'
    expect(billDataSchema.safeParse(bill).success).toBe(false)
  })

  it('rejects a negative unitPriceMinorUnits', () => {
    const bill = validBill()
    bill.items[0]!.unitPriceMinorUnits = -100
    expect(billDataSchema.safeParse(bill).success).toBe(false)
  })

  it('rejects a non-ILS currency', () => {
    const bill = { ...validBill(), currency: 'USD' }
    expect(billDataSchema.safeParse(bill).success).toBe(false)
  })

  it('rejects an item with zero assigned diners', () => {
    const bill = validBill()
    bill.items[0]!.sharedBy = []
    expect(billDataSchema.safeParse(bill).success).toBe(false)
  })
})

describe('renameRequestSchema', () => {
  it('accepts a normal name', () => {
    expect(renameRequestSchema.safeParse({ restaurantName: 'Japanika' }).success).toBe(true)
  })

  it('accepts an empty string (clears the name)', () => {
    expect(renameRequestSchema.safeParse({ restaurantName: '' }).success).toBe(true)
  })

  it('rejects a name over 60 characters', () => {
    expect(renameRequestSchema.safeParse({ restaurantName: 'a'.repeat(61) }).success).toBe(false)
  })
})
