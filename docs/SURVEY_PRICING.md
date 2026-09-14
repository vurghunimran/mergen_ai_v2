# Survey formula pricing

New quotes use `survey-formula-v1`, in USD integer cents:

- Students: `1000 + responses * (30 + 3 * questions)`.
- Institutions & Businesses: `2500 + responses * (50 + 5 * questions)`.
- Optional AI-generated summary: 2000 cents once, available only after the survey finishes and has responses. No AI-generated summary is included in the base price. Internal report field names remain unchanged for order compatibility.
- Question allowances: 5, 10, 15, 20, 25. Completed response targets: 50, 100, 250, 500, 1000.
- Q is the explicitly selected allowance. The editor permits at least 5 actual questions up to that allowance. It does not change the purchased allowance when adding/removing a question, nor round unsupported saved values.

`lib/survey-pricing.ts` is the only formula implementation, shared by `/pricing`, the authenticated survey receipt, and checkout. The CSV at `survey_pricing_academic.csv` is a reference for both categories, excluding the report. The public calculator defaults to institution; public selections do not establish payment eligibility. Draft receipts always calculate current prices and announce repricing when restored.

## Existing eligibility integration

Server pricing reads `client_profiles`, not category eligibility or totals supplied at checkout. Students, Graduate Students, and PhD Candidates with university affiliation qualify only with a confirmed auth email and a successful recheck of the existing client-signup email eligibility service. Faculty and institutional accounts use institution pricing. The frontend obtains its category from `/api/polar/pricing-category`; the checkout independently checks again and rejects a mismatch so a changed category cannot silently change the reviewed charge.

This reuses existing self-declared account positions and institutional-domain checks, including their existing fallback/admin behavior. It is not independent proof of current student enrollment. No new verification workflow was introduced. An institution email by itself does not grant student pricing.

## Migration and operations

Apply `supabase/migrate-survey-pricing-orders.sql` before enabling this code. It adds RLS-protected `survey_orders`, immutable-to-clients price snapshots, and a unique survey/order link. A database trigger enforces paid ownership, allowance, response target and report selection even for direct database writes. The server needs the existing `SUPABASE_SERVICE_ROLE_KEY`, Polar credentials and the existing one-time product. No production migration is run by the implementation or tests.

The order is persisted before requesting a Polar checkout. The returned checkout ID is linked before its URL is sent to the browser. Provider failure leaves an unpaid order; it never grants survey access. Verification compares provider customer, checkout ID, order metadata, currency and pre-tax amount against the saved order, not today's formula. Provider tax handling is unchanged. Additional discount codes are disabled for new formula checkouts; no browser-provided discount is accepted.

Publication independently verifies payment and the purchased allowance. The unique link prevents one checkout being used for multiple surveys. Existing published surveys and provider invoices remain untouched.

Older succeeded Polar checkouts lacking a local order are snapshotted at their ORIGINAL provider amount with version `legacy-polar-v0` and `requires_review = true`. They are not recalculated. Because the previous app did not persist a payment/survey association, an operator must reconcile these with existing surveys before releasing an unused payment for publication. Do not clear review for an already-consumed payment; link the existing survey through a controlled migration instead. Unsupported/incomplete legacy metadata requires manual review. Historical published rows with no order link keep their prior behavior.

The existing browser draft storage and return flow are retained. A lost draft still requires recovery; this task does not add webhook-based fulfillment or a new draft store.

## Verification

`npm test` uses Node's built-in test runner (the project had no prior test framework), TypeScript transpilation and isolated PGlite/PostgreSQL fixtures. It covers all 50 base combinations and report additions, runtime rejection, frontend/server agreement, account eligibility, spoofed prices, preserved historical amounts and payment/allowance enforcement. No real payment or production database is used.

Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` as well. Before release, apply the migration to a staging database and complete a Polar sandbox purchase/return/publication using confirmed eligible student and institutional accounts. Those external integration checks need a migrated environment.

Community credits, Trust Score and rewards are unchanged.

## Implementation checks

- 61 automated tests passed, including all 50 price combinations with/without the report and an isolated PostgreSQL migration/RLS/trigger test.
- `npm run lint`: passed without warnings or errors.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.
- No production deployment, live database migration, or real payment was performed.

## Files changed

- `README.md`
- `app/api/client-signup/eligibility/route.ts`
- `app/api/polar/checkout/[checkoutId]/route.ts`
- `app/api/polar/checkout/route.ts`
- `app/api/surveys/route.ts`
- `components/dashboard/ClientDashboard.tsx`
- `components/dashboard/CreateSurveyFlow.tsx`
- `lib/dashboard-data.ts`
- `lib/polar.ts`
- `lib/survey-pricing.ts`
- `package-lock.json`
- `package.json`
- `survey_pricing_academic.csv`
- `app/api/polar/pricing-category/route.ts`
- `app/pricing/page.tsx`
- `components/pricing/SurveyPriceBreakdown.tsx`
- `components/pricing/SurveyPricingCalculator.tsx`
- `docs/SURVEY_PRICING.md`
- `lib/client-pricing-category.ts`
- `lib/client-signup-eligibility.ts`
- `lib/survey-order-verification.ts`
- `lib/survey-orders.ts`
- `supabase/migrate-survey-pricing-orders.sql`
- `tests/survey-orders-db.test.cjs`
- `tests/survey-pricing.test.cjs`
