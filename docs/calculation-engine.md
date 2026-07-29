# Calculation Engine

`src/lib/money/` computes how a bill splits across diners. It's pure, framework-free TypeScript with no UI dependency — it's the one part of the codebase that must never be wrong, since every other feature (items, tip, summary, and eventually receipt scanning) builds on it producing the right numbers.

## Why integer minor units

All amounts are integers in a currency's smallest unit (agorot for ILS — 100 agorot = ₪1), never floats and never major-unit decimals. Floating-point arithmetic on money is a well-known source of drift (`0.1 + 0.2 !== 0.3`); repeated splitting and rounding across many diners and items would compound that drift into visibly wrong totals. Integers have no such rounding error — addition and subtraction are always exact. Amounts are only ever converted to a display string at the very last step, via `format.ts`.

## Why basis points for percentages

Tip percentages are stored as integer basis points (`1200` = 12%, `1250` = 12.5%; 10,000 basis points = 100%) rather than a decimal like `0.12`. This keeps fractional percentages (12.5%, custom values) exact integers instead of floats, for the same reason amounts are integers. `computeTipTotal` derives the actual tip in minor units from these basis points, rounding half up to the nearest minor unit.

## The largest-remainder allocation algorithm

`allocateProportionally(totalMinorUnits, weights)` in `allocate.ts` is the single primitive both item splitting and tip splitting are built on. Given an integer total and a set of weights, it must divide the total across parties in proportion to their weights — but exact proportional shares are almost never integers (splitting ₪1.00 three ways is 33.33 agorot each), so the result has to be rounded somewhere without losing or inventing money.

The algorithm:
1. Compute each party's exact share as `(total × weight) / totalWeight`.
2. Take the integer floor of each share as its base allocation.
3. The leftover (`total − sum of all floors`) is always a small non-negative integer, strictly less than the number of parties.
4. Hand out that leftover one minor unit at a time to the parties with the largest fractional remainder — the ones rounded down the most get made whole first.
5. Ties in the fractional remainder are broken by lowest index first, so the result is deterministic given the same inputs.

All the arithmetic here is done with exact integer numerator/denominator pairs (`numerator - base * effectiveTotalWeight` for the remainder), not by comparing floating-point fractions — this avoids any risk of floating-point noise flipping a rounding decision at the boundary.

If every weight is zero (e.g. tip allocation when no diner has ordered anything yet), the function falls back to an even split across all parties instead of dividing by zero or leaving the result undefined.

## Trust invariants

The engine exists to guarantee, by construction, that:

- **An item's split always sums back to that item's line total.** No agora is created or lost splitting a single item across its assigned diners.
- **The total tip always sums back exactly across diners**, allocated proportionally to each diner's subtotal.
- **Every diner's final total sums back to the bill's grand total** (subtotal + tip), with no exceptions for uneven splits, fractional tip percentages, or diners who ordered nothing (they simply get 0).

These aren't just documentation — `pipeline.test.ts` asserts them directly, including a sweep across a range of odd bill amounts, party counts, and tip percentages.

## The calculation pipeline

Given a set of items, a list of diner ids, and a tip config, the pipeline runs in this order:

1. **`computeDinerSubtotals(items, dinerIds)`** (`items.ts`) — for each item, `computeItemSplit` allocates its line total (`unitPriceMinorUnits × quantity`) across its `sharedBy` diners with equal weights, via `allocateProportionally`. Summing each diner's contribution across all items gives their subtotal. Diners with no items still appear, at 0.
2. **`computeBillSubtotal(items)`** — sum of every item's line total; this is what the tip percentage is applied to.
3. **`computeTipTotal(billSubtotal, tipConfig)`** (`tip.ts`) — the tip amount in minor units, rounded half up from the basis-point percentage.
4. **`computeDinerTipShares(dinerIds, dinerSubtotals, tipTotal)`** — allocates the tip total across diners via `allocateProportionally`, weighted by each diner's subtotal (not split equally).
5. **`computeDinerTotals` / `computeGrandTotal`** (`totals.ts`) — combines each diner's subtotal and tip share into a final total, and sums all diner totals into the bill's grand total.

Each stage only depends on the previous stage's output — there's no reaching back into raw items after the subtotal step, which keeps the pipeline easy to reason about and to test in isolation.

## Edge cases covered by the tests

- Even splits, and splits that don't divide cleanly (single and multiple simultaneous remainders)
- Unequal weights (item splits with different diner counts; tip splits weighted by unequal subtotals)
- All-zero weights (falls back to an even split rather than dividing by zero)
- Zero total (returns all zeros regardless of weights)
- A single party (gets the full amount)
- A diner who ordered nothing (subtotal and tip both 0, bill still reconciles)
- No tip at all — tip is optional, and a 0% bill must still reconcile exactly
- Fractional tip percentages (12.5%) and the exact basis-point examples from the product spec
- Half-up rounding on the tip amount
- A broad sweep across 1–7 parties, several odd non-round item prices/quantities, and six different tip percentages, asserting the grand-total invariant holds in every combination
