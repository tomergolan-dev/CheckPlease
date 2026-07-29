/** An integer amount in a currency's minor unit (e.g. agorot for ILS). Never a float. */
export type MinorUnits = number

export interface CalcItem {
  id: string
  unitPriceMinorUnits: MinorUnits
  quantity: number
  /** Diner ids sharing this item. Must always contain at least one id. */
  sharedBy: string[]
}

export interface TipConfig {
  mode: 'percentage'
  /** e.g. 1200 = 12%, 1250 = 12.5%. 10000 basis points = 100%. */
  valueBasisPoints: number
}
