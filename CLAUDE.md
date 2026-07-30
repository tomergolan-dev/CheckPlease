# Check Please

## Product Vision

Check Please is a real, startup-quality product — not a demo, portfolio piece, or coding exercise. It is being built with the intent to launch on the App Store and Google Play, and every decision (product and technical) should be made with that bar in mind.

**Mission:** make splitting a restaurant bill effortless, fair, and actually enjoyable.

**The problem:** groups finishing a meal default to someone opening a calculator, trying to remember who ordered what, manually figuring out shared items, and calculating tip by hand. It's slow, confusing, and awkward. Check Please eliminates that entire ritual.

**Design philosophy:** premium, minimal, elegant, modern, friendly, fast, delightful. Inspiration: Apple Wallet, Linear, Stripe, Airbnb, Notion. Avoid: generic dashboards, Material Design appearance, busy layouts, outdated UI, excessive color, heavy gradients. The interface should feel calm and effortless — every interaction should have a purpose.

**Mobile-first:** every UX decision prioritizes one-handed mobile usage. Desktop is secondary. Large touch targets, minimal typing, fast interactions, few screens, no unnecessary complexity. The target feel is a modern iOS app, not a responsive website.

**Core UX principle:** the user should never have to think. Reduce taps whenever possible. Default choices match the most common real-life restaurant scenario. Never force unnecessary input.

**Consumer app, not admin tool (permanent rule):** Check Please must feel like a delightful, casual consumer app used at a restaurant table — never like an admin CRUD system or a government form. This governs every screen built from here forward; see Consumer-App Interaction Model below for the concrete rules this implies.

## Consumer-App Interaction Model

This is a standing rule, not a one-time redesign — every future screen must be evaluated against it.

- **One continuous, scrollable bill canvas — not a step wizard.** Paying parties, dishes, and the tip/live summary all live on the same growing screen, not separate full pages or routes. The user scrolls back to edit an earlier section directly; there is no "back" navigation through a sequence of steps.
- **No forced "Continue" between routine sections.** A primary full-width call-to-action is reserved for a genuinely meaningful completion (e.g. "Start Splitting" on the intro screen) — never required just to move from paying parties to dishes to tip.
- **All temporary editing happens in bottom sheets, compact chips, or inline expansion** — adding/editing a diner, adding/editing a dish, choosing a tip, confirming a removal. Never a dedicated full page just to edit one thing; the user should always feel like they're still inside the same bill.
- **Warm, product-oriented copy over CRUD/admin language.** Prefer "Add a dish," "Add someone," "Who ordered this?" over "Add item," "Add record," "Edit entry," "Continue to next step." Copy must also stay general enough to cover the real range of bill entries — drinks, bottles, desserts, service charges — not just literal food ("Who ordered this?", not a food-specific phrasing that reads oddly for a bottle of wine). Icons and motion can communicate an action without a label at all when that's clearer than text. All copy must be localized naturally in Hebrew and English, not translated mechanically — the Hebrew is canonical natural phrasing in its own right, not a rendering of the English string.
- **Destructive controls stay secondary.** Removing a diner or dish lives inside its edit sheet as a secondary action, never a prominent icon sitting in the default row/card view.
- **Motion supports comprehension, not decoration.** Newly added diners/dishes animate in (and out on removal); totals animate on change rather than snapping; bottom sheets feel connected to the bill beneath them. Respect `prefers-reduced-motion` everywhere motion is used. Polished, not gimmicky or childish — the bar is Apple Wallet / Airbnb, adapted to a friendly restaurant-sharing context.
- **Responsive width:** mobile-first and thumb-friendly on phones. On larger viewports, constrain the experience to a centered, mobile-app-width canvas (not full-bleed) — the desktop view should read as a polished preview of the mobile product, never a stretched enterprise dashboard. This applies to bottom sheets too: they must stay a constrained, mobile-proportioned width and stay centered even when the browser viewport is wide, never stretching edge-to-edge on desktop.
- **Premium, comparable to leading consumer products — not a utility form.** The visual bar is a modern financial/payments app people enjoy using, not a spreadsheet with rounded corners. Subtle motifs from restaurants, receipts, menus, payment cards, and contactless payment may inform the visual language (color, iconography, card treatment) — but never literally across the app as a whole (no rendering every surface as a paper receipt, no thematic gimmicks). One deliberate, agreed exception: the live summary's total card uses a torn/perforated bottom edge as a single signature moment (see Visual System) — not a pattern to repeat elsewhere. Fresh, native, delightful; never childish or over-decorated.

## Confirmed MVP Scope

- Create a bill and manage diners (paying parties) dynamically throughout the flow
- Add items manually: name, unit price, quantity
- Every new item defaults to being shared by all current diners; user opens an item to adjust who's actually sharing it
- Tip is optional, selected via a dedicated action, calculated proportionally per diner's subtotal
- A summary showing each diner's subtotal, tip, and final total, always reconciling exactly to the bill grand total
- Hebrew (RTL) and English (LTR) interface support from day one, with initial language auto-detected from the browser/device locale (no manual switcher yet — see Hebrew and English Support)
- ILS (₪) as the first supported currency, he-IL locale
- Active bill auto-persisted locally so progress survives refreshes, app switches, and mobile browser reloads
- PWA-first mobile web app, installable, safe-area aware, Capacitor-wrappable later
- Receipt scanning as a second, co-equal way to create dishes alongside manual entry (see Receipt Scanning below)

## Explicitly Excluded From MVP

These are real future-vision features. The architecture must stay clean enough to add them later without rewrites, but none of them are built now:

- Tax/VAT calculation (target market is Israel; menu and receipt prices are already VAT-inclusive, so the app works directly with final item prices)
- User accounts, saved history, shareable bill links
- Payment integrations
- Per-person average display derived from party size
- Native app / React Native implementation

## Complete User Flow

One continuous, scrollable bill canvas — **not** a step wizard, not a separate Next.js route per section (see Consumer-App Interaction Model above). Everything lives in one persisted state object; scrolling back to an earlier section and editing it directly is the normal way to make changes, not a special case.

1. **Start** — a polished onboarding/intro screen, not a marketing landing page: subtle motion, restaurant/bill/payment-themed illustration, very little text, one clear primary action (e.g. "Start Splitting"). Inspiration is Apple Wallet / Airbnb's first-open moment, not a website hero section. Pressing the primary action transitions smoothly into the bill canvas — it must never feel like navigating to a different page. The current foundation-stage screen (brand name, tagline, "Start a new bill" button) is temporary scaffolding, not this intended experience; it gets replaced by this onboarding screen when that work is scheduled. An optional restaurant/bill-name field is available once bill setup begins (see Data Model) but is never required and never blocks progress.
2. **Paying parties** — a row of tappable diner chips (colored avatar, name, a party-size badge only when greater than one) plus a round "+" action to add someone (see Paying-Party Model below). Tapping a chip opens a compact edit sheet (rename, party size, "remove" tucked in as a secondary action). Diner management is available here at any time, by scrolling back to this section — not through backward navigation.
3. **Dishes** — item cards (name, line total, ×qty when greater than one, avatars of who's sharing it) grow the list as they're added. A round "+" action opens an add sheet; tapping an existing card opens its edit sheet to change name/price/quantity, toggle which diners share it, or remove it.
4. **Tip + live summary** — appears once at least one dish exists, so the user can see the subtotal before deciding on a tip (mirroring how people actually tip at a table). A compact tip chip ("Add tip" / "12%") opens the same bottom sheet described in Tip Behavior. Beneath it, a continuously updating summary — subtotal, tip, total, and each diner's current total — that never waits for an isolated "final" page to appear or update.

All interactive editing (diner management, item editing, tip selection, removal confirmation) uses **bottom sheets, compact chips, or inline expansion** — this is the primary interaction primitive of the app, not an exception. See Consumer-App Interaction Model for the full standing rule this follows from.

## Paying-Party Model

A "diner" represents a **paying party**, not necessarily one individual — e.g. "Diner 1" (party size 1), "Daniel & Dana" (party size 2), "Cohen Family" (party size 4).

- Every diner has: a stable internal `id` (used for all assignment/calculation, never changes), editable `name`, required `partySize` (default `1`), `color`, and a derived avatar/initial. There is no stored numeric index — when `name` is absent, the default label ("Diner N") is derived from the diner's current position among all diners, recomputed on every read (see Dynamic Diner-Management Behavior). Colors are assigned once at creation from a stable cursor and never change, so a diner's visual identity stays constant even as default labels shift.
- `partySize` is **required in the data model and UI**, but is strictly informational/display. It must **never** affect item splitting, never multiply or divide the party's total, and never otherwise enter any calculation. UI label is "Number of diners" / "כמות הסועדים" (not "Party size" / "גודל הקבוצה") — natural product copy, same non-calculating meaning.
- Each paying party receives exactly one combined subtotal, one tip amount, and one final total — regardless of party size.
- A future version may show an optional per-person average derived from party size. Not implemented in MVP; the field must already exist so this can be added without a data model change.

## Dynamic Diner-Management Behavior

Diners can be added, renamed, resized, or removed **at any point** in the flow, not only during initial setup.

**Adding a diner after items already exist:** the add-diner bottom sheet must ask the user explicitly how the new diner relates to existing items — never decide silently.

- Prompt (shown only if at least one item already exists): "Should this diner be included in the existing items?"
- Options: **"Yes, include in all existing items"** (default, selected) / **"No, I'll assign items manually"**
- If there are no existing items yet, this question is not shown at all.

**Removing a diner** — impact-aware, never silent:

1. Identify all items assigned to the diner being removed.
2. Identify, among those, any items where this diner is the *sole* assignee.
3. An item may never end up with zero assigned diners. If removal would orphan one or more items, the removal is **blocked** until the user reassigns each affected item (inline, as part of the same flow).
4. Before the removal is confirmed, show a clear summary of the consequences (which shared items will now be split among the remaining diners).
5. Item costs are never redistributed silently — the confirmation summary is what makes the change visible before it happens.

**A bill must always have at least one diner.** Removing the only remaining diner is never allowed — this is checked before the impact-aware flow even runs (not merely a side effect of every item becoming unresolvably orphaned). The UI must prevent this without a dead end: either the removal action is disabled with a clear inline reason ("At least one paying party is required" / "נדרש לפחות סועד אחד בחשבון"), never a confirmation sheet that opens with no valid way to complete it. The store enforces the same invariant defensively (`removeDiner` throws if called on a bill's only diner), independent of the UI.

**Default label renumbering:** default "Diner N" labels are derived from a diner's current position among all diners, not a stored value — so removing a diner closes the gap for everyone after it (Diner 1/2/3 minus Diner 2 becomes Diner 1/2, not Diner 1/3). Renaming a diner never renumbers anyone else, since the diners array itself doesn't change on a rename. Internal `id`s and colors are never affected by any of this — only the displayed default label shifts.

## Item-Assignment Invariants

- An item must always have at least one assigned diner. The UI must prevent deselecting the last remaining diner on an item and must clearly communicate why (disabled control + explanation), never allow it to silently fail or succeed.
- New items default to being assigned to **all** current diners. This is the confirmed MVP default; a "sticky last selection" default was considered and explicitly deferred pending real usage testing.

**Item-count edge cases:** unlike diners, a bill has no minimum item count — zero dishes is a normal, valid state (before the first one is added, or after deleting all of them), not an error to guard against.

- **Empty state:** when there are no dishes yet, the Dishes section shows a small dashed-border placeholder (muted icon + one short line, "No dishes yet" / "עדיין אין מנות") in place of the list — not a bare section with nothing but the add action.
- **Add action stays reachable regardless of list length:** the "Add a dish" action (and, alongside it, "Scan receipt" — see Receipt Scanning) is positioned **before** the dish list, not after it — so it never requires scrolling past a long list (tens of dishes) to reach it. This is a plain reordering, not a sticky/floating element — no new interaction pattern introduced for what's explicitly not an extreme case to optimize for.

## Receipt Scanning

A second, fully co-equal way to create dishes — manual entry and receipt scanning both produce the exact same editable `Item[]` shape (see Core Data Model), and neither ever replaces or restricts the other. Scanning is a convenience, not a different data path.

- **Entry point:** a "Scan receipt" chip sits next to "Add a dish," always in the same position, before the dish list, in every state (empty and non-empty) — there's no separate "scan vs. manual" fork in the UI, just two chips that open two sheets.
- **Flow:** tapping "Scan receipt" opens a bottom sheet with two choices — "Take a photo" (native camera, `capture="environment"`) or "Choose from library" (native gallery) — via a plain file input, not a custom camera UI. After a photo is picked, the same sheet crossfades (respecting `prefers-reduced-motion`) through a processing state — the picked photo itself as a dimmed thumbnail behind the spinner and "Reading your receipt…" — into a review step: an editable, staggered-in checklist of every detected dish (name and price both editable inline, each row individually excludable via a toggle), a running "Total to add" for the currently-included rows, a "Retake photo" link back to the picker, and a single confirm action that commits only the included rows. A failure (nothing detected, network/API error) shows a friendly retry prompt with "Try again" and "Add manually" — never a dead end.
- **Existing dishes on the bill:** if the bill already has any items (from a previous scan or added manually) when the review step is reached, the sheet asks explicitly what to do — never decides silently, mirroring the add-diner-with-existing-items question (see Dynamic Diner-Management Behavior). Two options: **"Keep them, and add these too"** (default, additive) or **"Replace them with these"** (clears every existing item first via the store's `clearItems` action, then adds only the confirmed scanned rows) — selecting Replace shows a one-line warning naming how many existing dishes will be removed, and the confirm button's label changes to make the outcome unambiguous before it happens.
- **Committing:** confirmed rows are added through the same store `addItem` action manual entry uses, tagged `source: 'scanned'`; they default to all current diners exactly like a manually-added dish and are immediately editable/removable the same way afterward via the existing item edit sheet, per the "AI enhances the workflow, it never replaces or restricts manual control" principle (see Core Data Model).
- **Visual marker:** a small muted `ScanLine` icon (matching the "Scan receipt" chip's icon) sits before the dish name on both the item row and the edit sheet's title, for any item with `source: 'scanned'` — a quiet provenance cue, not a badge/label, so it never competes with the name or price for attention. Manual items show no icon. This is purely presentational; it never affects calculation, editing, or the `Item[]` shape.
- **Technical approach:** a server-side Next.js API route (`POST /api/scan-receipt`, `src/app/api/scan-receipt/route.ts`) sends the receipt photo to Claude's vision API (structured JSON output via `output_config.format`) and gets back `{ name, price }` pairs directly — no separate OCR service, no custom line-grouping heuristics. This is the first backend code in the project. Chosen over cloud OCR (Google Vision/Textract) and client-side OCR (Tesseract.js) specifically because a vision-capable LLM handles mixed Hebrew/English receipts with minimal custom parsing code (see Hebrew and English Support — interface language and receipt-content language are independent).
- **Model tier:** `claude-sonnet-5` — tried the cheapest tier (`claude-haiku-4-5`) first for initial testing, but real-receipt testing showed it wasn't reliable enough (misread names/prices too often); Sonnet 5 is the accuracy/cost middle ground. The client also uploads at a higher resolution (2200px long edge) to use Sonnet 5's higher-resolution vision tier. `claude-opus-5` remains a one-line upgrade in `route.ts` if Sonnet 5 still isn't accurate enough in practice.
- **Request/response contract:** the client downscales and re-encodes the photo as JPEG (capped at 2200px on the long edge, matching Sonnet 5's high-resolution vision tier) before upload, then `POST`s `{ image: base64, mediaType, currency }` and receives `{ items: [{ name, quantity, unitPriceMinorUnits }] }` on success or `{ error: <code> }` on failure (`invalid_image`, `server_misconfigured`, `refused`, `upstream_error`, `network_error`). The model reports each line's total price and the quantity it covers (e.g. a receipt line reading "Burger ×2 — 124.00" is reported as quantity 2, not folded into a single misleadingly-priced item) — money conversion and the line-total → unit-price division both happen server-side using the same currency-parametrized money utilities as the rest of the app (`src/lib/money`), never a separate parsing path. The review sheet exposes quantity as an editable stepper per row, matching manual entry.
- **Configuration:** requires a server-side `ANTHROPIC_API_KEY` environment variable (see `.env.local.example`, gitignored via `.env*.local`) — never exposed to the client, never referenced outside the API route. If unset, the route fails clearly (`server_misconfigured`) rather than silently or with a generic 500.

## Tip Behavior

- Tip is **optional**, defaulting to "No Tip." It is never a mandatory step and never a dedicated page — it's a compact chip inside the live summary area (see Complete User Flow), appearing only once there's at least one dish, so the user sees the subtotal before deciding on a tip (mirroring real restaurant behavior).
- No slider. The chip shows the current state ("Add tip" when unset, or the active percentage).
- Tapping it opens a bottom sheet with fixed choices: **No Tip (0%) · 10% · 12% · 15% · Custom** (custom opens a numeric input inline within the same sheet). Selecting a preset applies immediately and closes the sheet in one tap; Custom requires an explicit Apply since it needs typed input.
- The user can reopen this control and change the tip at any time, with no need to re-enter or reconfirm anything else.
- Tip is calculated **proportionally to each diner's item subtotal** — never split equally across diners regardless of what they ordered.
- On confirmation, every diner's subtotal, tip amount, and final total update immediately, with a subtle animation — not an abrupt jump.
- Tip percentage is stored internally as **integer basis points**, never a decimal float, so that custom values (including fractional percentages like 12.5%) stay exact: 0% = `0`, 10% = `1000`, 12% = `1200`, 12.5% = `1250`, 15% = `1500`. Basis points are only ever used to derive an integer minor-unit tip amount (see Money Storage and Rounding Rules) — the final tip and totals are still calculated and rounded strictly in integer minor currency units.
- **Custom tip input is validated, never silently coerced.** Non-numeric or malformed input (e.g. "abc", "12abc") must never silently fall back to a plausible-looking 0% — Apply stays disabled and a clear inline error shows once the field is non-empty and invalid. A comma decimal separator ("12,5") is accepted identically to a period ("12.5") and normalized automatically — no error shown for that, since it's valid input in a different, expected notation, not a mistake. No upper bound on the custom percentage in MVP; revisit only if product requirements change.

## Optional Payment Rounding

A **presentation/payment layer only** — it never touches the exact calculation engine, which remains the single source of truth for every amount. Implemented as a separate layer on top of the engine's `DinerTotal[]` output (`src/lib/money/payable.ts`), not as a change to `allocate.ts`/`items.ts`/`tip.ts`/`totals.ts`.

- A toggle on the Summary screen — Hebrew label "לעגל סכומים כלפי מעלה" ("round amounts up") — **default OFF**.
- When enabled, each diner's already-computed final total (subtotal + tip, exactly as the engine calculated it) is rounded **up** to the next whole shekel. Never rounds individual items, never rounds any intermediate calculation — only the one final per-diner number, and only after it's already exact.
- If a diner's exact total is already a whole shekel amount, it's left unchanged.
- Per-diner display: exact amount → payable (rounded) amount, e.g. `₪33.33 → ₪34`. The **rounded amount is visually dominant** (larger/bolder); the exact amount stays visible but secondary (smaller, muted). If already whole, just show the one amount (no arrow) — no additional explanatory text. The arrow must visually point in the reading direction in both RTL and LTR (mirror it, don't leave it pointing the wrong way in Hebrew).
- Bill-level display follows the Bill Summary Terminology and Display Order below — the rounding surplus is one row in that fixed order, not a standalone three-line block.
- Toggling the option only changes what's *displayed* as payable — it never mutates the exact totals, and the exact grand total is always available regardless of the toggle state.
- Persisted as `roundUpPayments` (boolean, default `false`) on the Bill (see Core Data Model).

## Bill Summary Terminology and Display Order

The live summary (and its richer final form) uses a fixed conceptual order and fixed product-oriented labels — never ad hoc synonyms for the same number in different places.

1. **Original amount** — "Original amount" / "סכום מקורי" — the bill subtotal before tip (sum of every item's line total).
2. **Tip** — "Tip" / "טיפ" — the calculated tip amount.
3. **Subtotal** — "Subtotal" / "סכום ביניים" — original amount + tip. Shown **only when tip > 0**; when tip is zero, original amount + 0 = subtotal, so repeating it adds no information and the row is hidden.
4. **Payment rounding** — "Payment rounding" / "עיגול סכומים" — the surplus created by Optional Payment Rounding. Shown **only when rounding is enabled and actually changes the total** (surplus > 0) — hidden rather than displaying a redundant `+₪0`.
5. **Total to pay** — "Total to pay" / "סה"כ לתשלום" — always shown, always last: the payable grand total when rounding is active, otherwise the exact total (original amount + tip).

The summary must never show two rows that are numerically identical purely for "completeness" — every visible row has to add information the reader doesn't already have. Concrete cases:

- Tip > 0, rounding active: Original amount → Tip → Subtotal → Payment rounding (+X) → Total to pay.
- Tip = 0, rounding inactive: Original amount → Tip (₪0.00) → Total to pay (equals original amount). No Subtotal row.
- Tip = 0, rounding active: Original amount → Tip (₪0.00) → Payment rounding (+X) → Total to pay. Subtotal is still hidden — it would equal the original amount.
- Tip > 0, rounding inactive: Original amount → Tip → Subtotal → Total to pay (equals subtotal). No Payment rounding row.

These English labels are **product copy**, not mechanical translations of the Hebrew (or vice versa) — each language's phrasing is chosen to sound natural on its own.

## Hebrew and English Support

- Hebrew and English are both first-class languages from the beginning — Hebrew is not a translation layer bolted on later.
- Full RTL interface for Hebrew, full LTR interface for English, localized labels/messages, and locale-correct currency/number formatting.
- Initial interface language is determined automatically from the browser/device locale (via `Accept-Language` detection) — there is no visible manual language switcher for now. A manual switcher will return once there's a proper Settings screen with real user settings beyond language (candidates: language, theme, currency, about, privacy); it isn't worth a standalone UI just for this one toggle. Do not spend time designing that Settings screen until it's actually scheduled.
- URL-based locale routing (`/en`, `/he` via `next-intl`) is a **development-time convenience, not a permanent product decision.** The final product should not expose `/en`/`/he` as part of the user-facing experience. As the app matures, evaluate cleaner approaches (locale resolved from device/browser preference or managed internally via app settings, with no visible locale segment in the URL) so the architecture isn't permanently locked into URL-based localization. No need to change this now — just don't build anything new that assumes the URL segment is a permanent, user-facing concept.
- The **interface language** and the **receipt-scan language** are independent — a user may use the app in English while scanning a Hebrew receipt, or vice versa. Interface localization must not assume receipt content language, and the scan prompt extracts item names in whatever language the receipt is printed in rather than translating them.
- Typeface: **Heebo** is the primary typeface for both Hebrew and English, chosen specifically to give a unified visual identity across RTL and LTR layouts rather than pairing two different typefaces per language.

## RTL and LTR Implementation Rules

- Use CSS/Tailwind **logical properties** everywhere (`ms-`/`me-`/`ps-`/`pe-`, `start`/`end`) — never physical `ml-`/`mr-`/`pl-`/`pr-` or `left`/`right` positioning for anything that should mirror between RTL and LTR.
- Set `dir` on `<html>` based on the active interface locale.
- This is treated as a hard rule from the first component built, not a cleanup pass — retrofitting RTL later is expensive; building it in from line one is not.

## Visual System

Concrete conventions that keep the "premium consumer app" bar consistent as more screens get built — apply these rather than inventing new patterns per screen:

- **Background vs. card contrast does the work a border used to.** `--background` is a deliberate step darker/cooler than `--card` (not near-identical), so cards visibly pop off the page via color/lightness alone — a hairline border (`border-border/40`) is a light accent on top of that contrast, not the only thing drawing the card's edge. This is the difference between "bordered boxes on a form" and "surfaces on an app."
- **Card surfaces:** `rounded-2xl` (or `-3xl` for larger hero surfaces), `bg-card`, `border-border/40`, and a shadow for depth.
- **Two-tier shadow hierarchy:** `shadow-soft` for secondary/list rows, `shadow-elevated` for the single most important surface on a screen (e.g. the bill total card) and for hover-lift states — both are layered, negative-spread shadows (a surface lifting off the page, not a diffuse haze), not decoration.
- **Inputs are filled, not boxed.** `Input` (`src/components/ui/input.tsx`) is a borderless `bg-muted/70` filled field, not a bordered HTML-form box — on focus it lifts to `bg-card` with a soft colored ring, rather than just swapping the border color. This is a deliberate, permanent departure from shadcn's default bordered input.
- **Primary buttons carry a colored glow**, not a flat single-tone fill — `shadow-md shadow-primary/25` (stronger on hover) under the `default` Button variant, the kind of soft colored shadow real payment/fintech apps put under their main CTA.
- **Interactive states, applied consistently to every custom tappable element** (chips, cards, add actions): a hover lift (`hover:-translate-y-0.5 hover:shadow-elevated`) for pointer devices, a press-down (`active:scale-95` / `active:scale-[0.98]`), and a visible `focus-visible:ring-2 focus-visible:ring-ring/50` for keyboard navigation. Never ship a custom interactive element without all three.
- **Section identity:** each canvas section (paying parties, dishes, summary) has a small uppercase label paired with a themed, colored icon badge (`SectionHeading` — people/utensils/receipt, each with its own tone: blue/amber/violet) rather than a plain heading, reinforcing the restaurant/payment identity at a glance without literal illustration.
- **Diner color as identity:** a diner's assigned color shows up everywhere they appear — avatar, chips, per-diner summary rows — via the shared soft-tint token map, never a one-off color. A `ring-2 ring-card` (or `border-2 border-card`) around avatars keeps overlapping/adjacent avatars visually separated against the card background.
- **Colored icon badges, one shared palette:** `IconBadge` (`src/components/shared/icon-badge.tsx`) wraps an icon in a small soft-tint colored circle, reusing the exact same `DINER_COLOR_CLASSES` token map diner avatars use — section headings, empty states, and every "add/scan" trigger chip's icon go through this one component rather than a one-off `bg-accent`/`bg-primary` circle per screen. This is what gives icons color-coded meaning (diners=blue, dishes=amber, summary/scan=violet, tip=green) instead of uniform gray.
- **Ambient background:** `AmbientBackground` (`src/components/shared/ambient-background.tsx`) renders a few large, heavily blurred, slowly drifting color washes behind the entire bill canvas (mounted once in `BillEntry`, absolutely positioned within the centered mobile-width column) — an ambient presence, not a focal point. Uses logical `insetInlineStart`/`insetInlineEnd` positioning so it mirrors correctly in RTL, and respects `prefers-reduced-motion` (renders static, no drift).
- **Numbers:** every displayed currency amount uses tabular figures (`tabular-nums`) so amounts align vertically in lists and don't jitter as animated totals change.
- **The single most important number on a screen looks like it** — "Total to pay" is visually dominant (larger, bold, primary color) against every other row's plain `text-sm`, the same way a payments app makes the headline balance/amount unmistakable at a glance rather than just another line in a list.
- **Bottom sheets are mobile-proportioned everywhere**, including on desktop viewports — constrained width, centered, never edge-to-edge (see Responsive width above).
- **Bottom sheets whose content scales with data (per-diner assignment chips, per-item reassignment pickers) must scroll their own body**, not the whole sheet — wrap that middle content in `min-h-0 flex-1 overflow-y-auto` between the header and footer, so the header stays visible, the footer's action stays reachable, and a bill with a large number of diners (~10–20+) never pushes content off-sheet or overlaps the footer.

## Money Storage and Rounding Rules

- All monetary values are stored and calculated as **integer minor units** internally (agorot for ILS) — **never floating-point arithmetic** for anything financial.
- A single formatting utility (parametrized by currency + locale) is the only place a minor-unit integer is ever turned into a display string. No ad hoc string formatting elsewhere.
- Every item has `unitPriceMinorUnits` and `quantity` (default `1`, minimum `1`, compact increment/decrement control in the UI). The line total is **derived** as `unitPriceMinorUnits × quantity` and is not persisted unless a strong technical reason emerges later.
- Splitting uses a single reusable **largest-remainder allocation** primitive — `allocateProportionally(totalMinorUnits, weights[], options?)` — applied at two levels:
  1. **Item → diners**: each item's line total is split across its assigned diners (equal weights), summing exactly back to the line total.
  2. **Tip → diners**: the total tip (rounded to the nearest minor unit) is allocated across diners weighted by each diner's subtotal, summing exactly back to the total tip.
- **Fair remainder rotation across repeated equal-weight splits.** When every party has equal weight (the normal item-split case), their fractional remainder is identical for all of them — it's a full tie, not a near-tie — so a lone tie-break of "lowest index wins" would hand the leftover agora to the *same* diner on every item a group shares, not just once. `computeDinerSubtotals` (`src/lib/money/items.ts`) tracks how many times each diner has already won that leftover agora across the bill's items so far, and passes it as `allocateProportionally`'s `tieBreakPriority` option (lower value wins) so the extra agora rotates fairly across a bill with many shared items instead of always favoring whoever is earliest in the diner list. `allocateProportionally` still defaults to lowest-index-wins when `tieBreakPriority` is omitted, for any one-off caller (tip allocation doesn't need this — it's a single allocation event per bill, not a repeated one, so the bias can't compound there).
- Invariant that must always hold and must be tested: the sum of all diners' final totals equals the bill's grand total exactly. No money is ever created or lost to rounding.
- Architecture must not hardcode single-currency assumptions, even though ILS is the only currency shipped in MVP.
- The optional payment-rounding feature (see Optional Payment Rounding) is layered strictly on top of these exact totals for display/payment purposes — it is not an exception to any of the rules above, and the engine itself never rounds up.

## Core Data Model (conceptual)

- **Bill**: `id`, `createdAt`/`updatedAt`, `currency`, `locale`, `restaurantName?` (optional, never required, never blocks progress — labeled "Restaurant name — optional" / "שם המסעדה — לא חובה"), `diners[]`, `items[]`, `tip`, `roundUpPayments` (boolean, default `false` — the Optional Payment Rounding toggle)
- **Diner**: `id` (stable UUID), `name?`, `partySize` (required, default `1`, display-only), `color` (assigned once at creation, stable) — no stored index; the default "Diner N" label is derived from position, not stored (see Dynamic Diner-Management Behavior)
- **Item**: `id`, `name`, `unitPriceMinorUnits`, `quantity` (default `1`, min `1`), `sharedBy: dinerId[]` (min length 1, always), `source: 'manual' | 'scanned'` (records how the item was created; never affects calculation or display), ordering field
- **Tip**: `{ mode: 'percentage', valueBasisPoints: number }` — percentage-only, stored as integer basis points (e.g. `1200` = 12%); no flat-amount tip mode in MVP

Both manual entry and receipt scanning (see Receipt Scanning) produce the exact same `Item[]` shape. After scanning, users must always be able to edit an item's name/price, delete an incorrectly detected item, add a missing item manually, and correct any AI mistake — AI enhances the workflow, it never replaces or restricts manual control.

## Architecture Decisions

- **Framework:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Lucide icons.
- **Routing:** an `[locale]` segment (`en` / `he`) via `next-intl` for routing, message catalogs, and `Intl`-based number/currency formatting. Locale is a top-level routing concern, separate from and not in conflict with the single-route, step-based bill flow.
- **State:** a Zustand store (`src/lib/store/bill-store.ts`) holding the active bill (diners, items, tip), persisted to `localStorage` via Zustand's `persist` middleware — this satisfies the auto-save requirement without bespoke persistence code. There is no "current step" in the store — the UI is one continuous canvas, not a wizard (see Consumer-App Interaction Model). Persistence is skipped on initial hydration (`skipHydration`), so `bill` reads as `null` until rehydration finishes regardless of what's actually in `localStorage`; the storage factory falls back to a no-op outside the browser so the module is safe to import from anywhere. Derived totals are never stored — they're computed on demand from `src/lib/store/selectors.ts`, which calls straight into the calculation engine.
- **Hydration gating:** `useIsBillStoreHydrated()` (`src/lib/store/hydrate-bill-store.tsx`) tracks whether rehydration has actually completed, via the persist middleware's own `onFinishHydration`/`hasHydrated` API — not a fixed timeout or a guess. `BillEntry` renders a minimal branded boot state while this is false, so a returning user with an existing bill never flashes the "no bill yet" welcome screen before snapping into their real bill. Anything that reads `bill` to decide what to render should gate on this the same way, not trust `bill === null` alone to mean "no bill exists."
- **Calculation engine:** pure, framework-free functions with zero UI coupling, fully unit-tested in isolation. This is the one part of the codebase that must be bulletproof, since it's the trust-critical core of the whole product.
- **Component styling:** shadcn primitives are a starting point, not the finished look — they need a real custom theme (color tokens, radius, shadow) to reach the Apple Wallet / Linear / Stripe aesthetic. Default shadcn theming does not meet the bar.
- **Interaction primitive:** bottom sheets (shadcn's `Drawer`, Vaul-based) are the core, reused pattern for item editing, diner management, tip selection, and removal confirmation — never a dedicated full page for a routine edit. Prefer mobile-native patterns generally — bottom sheets, chips, contextual/inline editing, tap-first interactions — over traditional web forms. Floating action buttons are **not** a mandatory pattern; use one only where it genuinely improves discoverability and doesn't compete with a screen's primary action — a sticky bottom action button or an inline action may be the better fit elsewhere. Choose per screen based on clarity and usability, not visual novelty.
- **Animation:** list insertion/removal (diners, dishes) and animated total updates use a lightweight animation layer (Framer Motion), respecting `prefers-reduced-motion`. Animated number/currency updates are a small custom hook (`useAnimatedNumber`) on top of it, not a separate dependency.
- **Responsive layout:** the bill canvas is constrained to a centered, mobile-app-width column (not full-bleed) at all viewport sizes — desktop is a polished preview of the mobile product, not a stretched dashboard.
- **PWA:** the MVP foundation is manifest, icons, safe-area (`env()`) insets, standalone display mode, theme color, and correct mobile viewport behavior — enough to be installable. A service worker and offline/asset caching are **explicitly deferred** until the primary bill flow is stable and tested, to avoid stale-asset and dev-caching issues while the app is still changing quickly. Native wrapping (Capacitor) is a later, separate step that should require no application code changes if the PWA layer is done correctly. No native or React Native implementation at this stage.
- **Backend:** a single Next.js API route (`src/app/api/scan-receipt/route.ts`) is the app's only server-side code, existing solely to keep the `ANTHROPIC_API_KEY` off the client (see Receipt Scanning). It has no database, no auth, and no other responsibility — the app is otherwise still a static/client-persisted PWA.

## Folder and Component Conventions

- Domain logic (calculation engine, allocation primitive, data model types) is isolated from UI and framework code, so it can be reused unchanged by any future input method (manual entry today, AI receipt scanning later).
- Domain/UI separation should read as: pure calculation and types in one layer, state/store in another, presentational and interaction components in another — favor this separation over convenience, since it is what keeps the future receipt-scanning integration a pure addition rather than a rewrite.
- Reusable primitives (bottom sheet, avatar/color chip, animated amount) are built once and shared across every feature that needs them, not re-implemented per screen.

## Dependency Guidelines

- Avoid unnecessary dependencies. Prefer reusable, strongly-typed, component-driven code over pulling in a library for something a small utility can do.
- Every dependency beyond the confirmed stack (Next.js, TypeScript, Tailwind, shadcn/ui, Lucide, next-intl, Zustand, Framer Motion) should be justified against a real, specific need in this document — not added speculatively for a future feature.
- `@anthropic-ai/sdk` — server-only, used exclusively by the Receipt Scanning API route (see Receipt Scanning) to call Claude's vision API. Never imported from client components; image compression on the client uses the native Canvas API instead of a library.

## Testing Requirements

- The calculation engine (allocation primitive, item split, tip split, diner totals) must be unit-tested in isolation from the UI, with explicit tests for the invariant that diner totals always sum exactly to the bill grand total (including tip), across edge cases like uneven splits, multiple simultaneous remainders, and fair remainder rotation across repeated equal-weight splits (a group of diners sharing many items must not have the leftover agora always land on the same diner).
- Item-assignment invariants (never zero diners on an item, diner-removal reassignment blocking) should have test coverage at the logic level, not only be relied upon via UI behavior.

## PWA-First Requirements

- Build as a high-quality, installable, mobile-first web application first. Native app store distribution is intended to come later via Capacitor wrapping — do not build native or React Native code now.
- The application shell must account for mobile safe areas, touch-friendly targets, standalone PWA usage, native-feeling transitions, and structure that will support a future native share sheet, even though sharing itself is not implemented in MVP.
- **Initial PWA foundation (MVP):** web app manifest, application icons, standalone display mode, theme color, correct mobile viewport behavior, safe-area support, and an installable-app-compatible structure.
- **Explicitly deferred:** a service worker and any offline/asset caching. Add these only once the primary bill flow is stable and tested — introducing caching too early risks stale-asset and development-caching problems while the app is still under active change.

## Incremental Development Rules

- Do not implement screens or business logic until the relevant product decisions have been explicitly confirmed in conversation and reflected in this document first.
- When a new feature or edge case comes up, check whether it belongs in the confirmed MVP scope above or is a future-vision item — if future, design the extension point, don't build the feature.
- Prefer the simpler solution by default; push back (in conversation, before building) on anything that adds complexity without a clear UX or reliability payoff, rather than silently implementing it.
- Move quickly through the confirmed MVP scope rather than expanding it — only raise a concern when there's a genuine architectural issue, not routine polish.

## Product-Design Mindset (Permanent Rule)

Past the initial MVP build, work on Check Please is product design as much as engineering. This governs how every future change should be approached, not just how the app looks today:

- Continuously look for friction, admin-tool feel, or missed delight — don't just implement the literal request and stop. If a request is well-served by more than its literal scope (a better empty state, a more natural default, a clearer hierarchy) while staying within what was actually asked, take it.
- The bar is a small set of reference products (Apple's own apps, Airbnb, Revolut, Spotify) — polished, modern, a little memorable, never a form or a dashboard.
- Propose bigger ideas rather than sitting on them. A genuinely better structural or visual direction is worth surfacing even if it wasn't asked for — but propose it, don't silently execute a large unrequested redesign.
- **After every implementation, report as a product designer would, not just a changelog:** one UX improvement made, one visual improvement made, one interaction simplified, and one future capability the architecture was deliberately kept ready for. This is a standing reporting format now, not a one-time exercise.

## MVP Build Order

Build incrementally in this sequence; each stage should be working and reviewed before the next begins:

1. **Calculation engine** — pure, framework-free money/split/tip math (see Money Storage and Rounding Rules), fully unit-tested in isolation before any UI depends on it.
2. **Bill state** — the Zustand store and persisted data model (Bill/Diner/Item/Tip) that the UI will read and mutate.
3. **Paying parties** — add/rename/resize/remove diners as a section of the continuous bill canvas, including the impact-aware removal flow.
4. **Dishes** — add/edit/remove items as a section of the same canvas, default-all-diners assignment, the assignment bottom sheet.
5. **Tip + live summary** — the tip chip and bottom sheet, plus a continuously updating subtotal/tip/total and per-diner summary (see Complete User Flow) — not a separate step or page.
6. **Complete final summary** — enriching the already-live summary with the Optional Payment Rounding toggle and any remaining final-reveal polish, not building a summary page from scratch.
7. **Polish** — the premium onboarding/intro screen (replacing the temporary foundation placeholder), deeper transition/animation detail.

Steps 3–5 are not separate pages — they're sections of one continuous canvas (see Consumer-App Interaction Model), built and reviewed in this order but always presented together. The onboarding/intro screen described under Complete User Flow is intentionally sequenced last (Polish), not first — the core bill-splitting mechanics need to exist and work before the first-impression experience is worth investing in.
