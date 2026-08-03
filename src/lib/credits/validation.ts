import { z } from 'zod'
import { CREDIT_PACKS } from './packs'

const packTypes = CREDIT_PACKS.map((pack) => pack.type) as [string, ...string[]]

export const purchaseInputSchema = z.object({
  packType: z.enum(packTypes),
})

export type PurchaseInput = z.infer<typeof purchaseInputSchema>
