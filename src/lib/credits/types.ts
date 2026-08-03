export type CreditLedgerType = 'signup_bonus' | 'purchase' | 'promo' | 'referral' | 'consumption' | 'refund'

export interface LedgerEntryInput {
  userId: string
  type: CreditLedgerType
  /** Signed: positive credits in, negative out. */
  amount: number
  relatedScanId?: string
  idempotencyKey: string
}

export type ApplyLedgerResult =
  | { applied: true; balance: number }
  | { applied: false; reason: 'duplicate'; balance: number }
  | { applied: false; reason: 'insufficient_credits'; balance: number }
