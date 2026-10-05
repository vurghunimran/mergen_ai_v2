# Owner business dashboard

Open `/dashboard/admin` with the existing owner account. The server checks the authenticated identity using `ADMIN_USER_IDS` (if configured), otherwise the verified auth email against `ADMIN_EMAIL` / `ADMIN_EMAILS`. Page layout and data reads enforce this independently; expense writes also reject foreign or missing origins. There is no preview or public auth bypass.

Apply `supabase/migrate-admin-business-dashboard.sql` before release. It adds two RLS-protected tables with no browser-role privileges. Expense writes use the service-role client after owner authorization. Existing survey pricing, payments, credits, payout flags and rewards availability are unchanged.

## What the dashboard measures

- Overview and Orders: durable `survey_orders`, including unpaid checkout attempts. New checkouts retain the provider environment; historical records are unclassified until corroborated. Only production-tagged paid orders contribute to live financial totals; sandbox and unclassified rows remain visible in the order list with filters. Paid values use stored order amounts; they are before tax/fees and are not settlements or profit. All refunded orders are excluded from retained value. A survey linked to an order means publication, not completion of response collection. Older surveys without an order link are not inferred to be purchases.
- Community: all `profiles` with the community role, joined to `community_profiles` for country. Missing country/profile details are included as “Not set”; all countries are shown and searchable. Total membership is all time; the joined count uses the selected period.
- Expenses: actual payments entered by the owner, with provider, date, amount, currency, description and optional receipt reference. USD, EUR, GBP and AZN are supported without currency conversion. Top-ups are separated from expenses. Retry IDs prevent duplicate submission; voiding preserves the row and owner audit information. No recurring costs, invoice amounts or dates are guessed.
- AI activity: future Perplexity survey creation and Gemini evaluation/report calls. Metadata only: provider, model, scope, outcome, tokens and reported USD cost. Perplexity Agent `usage.cost.total_cost` is accepted only with USD currency. Gemini reports tokens, not invoiced cost. Missing cost is unknown, not zero. Usage consumption is never added to expense payments/top-ups. Telemetry failure logs a non-sensitive error and does not break a survey. Historical usage is not reconstructed.

Monthly grouping uses Asia/Baku. For orders, the period is the creation month because the current order schema does not retain a verified payment timestamp. Expenses use the supplied payment date. Use All time when comparing historical totals. Source query failures render an unavailable notice rather than silently showing a partial total.

Vercel, Supabase, Resend and other provider invoices are not automatically synchronized. Record them from actual receipts. The owner's October 3 note reports a $10 Perplexity payment and a Vercel Pro upgrade, but lacks exact payment dates and the Vercel amount; these have not been invented or seeded into the ledger.

Provider schemas: [Perplexity Agent usage](https://docs.perplexity.ai/api-reference/agent-post), [Gemini usage metadata](https://ai.google.dev/api/generate-content).

## Verification

Run `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`. The business tests cover refund/expense accounting, timezone boundaries, all-country inclusion, validation, owner authorization and origin checks, retry conflicts, soft voids, telemetry isolation and PostgreSQL permissions. Verify the signed-in owner views at desktop and mobile widths, and confirm anonymous page/API requests cannot access this data. Financial provider calls and reward/payout activation are not part of this release.

October 5 checks: 119 tests passed, type check and lint passed. The signed-in owner views loaded real database data without unavailable notices, period changes and country search worked, mobile pages had no horizontal overflow (wide tables scroll inside their containers), and anonymous page/API access was rejected. A malformed expense amount was rejected before storage. No fabricated expenses, payments or payouts were created. The owner accepted the current signup policies and requested `team@mergen-ai.com`; the new login was provisioned and its random password saved in macOS Keychain under “Mergen AI owner dashboard”. Production access is pinned to that account ID.
