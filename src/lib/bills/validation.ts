import { z } from 'zod'
import { DINER_COLOR_TOKENS } from '@/lib/store/palette'

const dinerColorTokenSchema = z.enum(DINER_COLOR_TOKENS)

const dinerSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  partySize: z.number().int().positive(),
  color: dinerColorTokenSchema,
})

const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  unitPriceMinorUnits: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  sharedBy: z.array(z.string().min(1)).min(1),
  source: z.enum(['manual', 'scanned']),
  sortIndex: z.number().int(),
})

const tipConfigSchema = z.object({
  mode: z.literal('percentage'),
  valueBasisPoints: z.number().int().nonnegative(),
})

/**
 * Mirrors src/lib/store/types.ts's `Bill` shape — nothing auto-derives this from the TS
 * interfaces, so keep the two in sync by hand when the store shape changes. `status` is accepted
 * (forward/back compat with the client shape) but never trusted server-side — see the comment on
 * the `bills` table in src/lib/db/schema.ts for why.
 */
export const billDataSchema = z.object({
  id: z.string().min(1),
  createdAt: z.number(),
  updatedAt: z.number(),
  currency: z.literal('ILS'),
  restaurantName: z.string().optional(),
  roundUpPayments: z.boolean(),
  nextDinerColorIndex: z.number().int().nonnegative(),
  diners: z.array(dinerSchema),
  items: z.array(itemSchema),
  tip: tipConfigSchema,
  status: z.enum(['draft', 'completed']).optional(),
})

export const syncRequestSchema = z.object({ bill: billDataSchema.nullable() })

export type SyncRequestInput = z.infer<typeof syncRequestSchema>
