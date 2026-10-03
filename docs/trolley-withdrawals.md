# Trolley cash withdrawals

MERGEN community members can exchange **920 credits for $10 USD**. The minimum is 920 credits; amounts are multiples of 920, up to 920,000 credits per request. This rate was approved on 2026-10-03. Cash withdrawals have their own release switch; gift rewards remain closed.

## Account setup and activation

1. Complete Trolley merchant approval for MERGEN's legal entity and survey-participant payout model. Confirm funding, supported destinations, route minimums, foreign exchange, tax requirements, and fees. The advertised country count does not establish account or route eligibility.
2. Create sandbox API keys in Trolley's sandbox environment. Set `TROLLEY_SANDBOX_ACCESS_KEY` and `TROLLEY_SANDBOX_SECRET_KEY` on the server. Sandbox keys never enable member withdrawals or deduct real member credits. API-level automated tests currently use simulated provider responses; an actual sandbox payment still needs credentials and testing.
3. The database requires `supabase/migrate-prelaunch-security.sql`. Apply `supabase/migrate-trolley-withdrawals.sql` after it. It is transactional and safe to rerun. It creates cash withdrawal storage and service-only reservation, submission, settlement, and cancellation functions.
4. Store `TROLLEY_LIVE_ACCESS_KEY`, `TROLLEY_LIVE_SECRET_KEY`, and `TROLLEY_LIVE_WEBHOOK_SECRET` as server secrets in Vercel. Never use `NEXT_PUBLIC_` prefixes for these values or commit them. Sandbox and live keys use the same API host but belong to separate Trolley environments; the integration selects explicit key pairs.
5. In the **live** Trolley dashboard, configure `https://mergen-ai.com/api/trolley/webhook` for all Payment events (created, updated, processed, failed, returned). Store that subscription's HMAC secret in `TROLLEY_LIVE_WEBHOOK_SECRET`. The endpoint verifies signed requests, including the signed empty-object validation request. It fetches current payment state instead of trusting event order.
6. Set `TROLLEY_ALLOWED_COUNTRIES` to reviewed ISO codes, separated by commas. It defaults to empty, so no destination is implicitly enabled. Bank routes, currencies, and minimums must be tested before a country is included. For example, Azerbaijan's advertised route is a USD wire; confirm fees/minimums and recipient tax ID requirements with Trolley before approving it.
7. After a sandbox payment, webhook validation, fee review, account funding, and a controlled live payout check succeed, set `TROLLEY_MODE=live` and `TROLLEY_WITHDRAWALS_ENABLED=true`, then redeploy. Disabling this switch stops new withdrawals; signed webhooks and owner reconciliation continue to update existing payouts.

The initial implementation covers Trolley network fees from MERGEN's funding balance (`coverFees: true`). Member valuation remains $10 per 920 credits; foreign exchange, required tax withholding, and receiving/intermediary-bank charges can affect the received amount. This fee policy must be included in launch economics.

## Member experience

The Rewards section contains a cash withdrawal panel, the approved rate, country availability, bank setup, and payout history. Bank setup uses a freshly signed Trolley iframe tied to the authenticated member's ID and email. The server accepts neither a caller-supplied recipient ID nor bank account details. It resolves Trolley recipients by exact internal reference and checks active status, bank payout method, email, and country before reserving credits.

Credits are reserved in the existing `reward_activations` ledger inside a database transaction with a member lock. This prevents concurrent cash or future gift redemptions from spending the same balance. A persistent request UUID restores the same withdrawal on retry. Cash requests bypass the gift reward activation endpoint.

Trolley's `processed` payment state is displayed as **Sent by Trolley**, which does not certify bank receipt. Confirmed `failed` or `returned` payments cancel the linked credit reservation exactly once. The provider's actual target amount/currency is shown when available.

## Owner operations

Open `/dashboard/admin/withdrawals`. The page and `/api/admin/withdrawals` require the established owner identity checks.

- **Sync provider status** reads the original batch/payment and reconciles it. This does not initiate a payout.
- **Resume original payout** recovers the tagged batch and payment reference before resuming an unprocessed batch. It never creates a second batch after an ambiguous batch POST. Each payment also has a unique provider `externalId` equal to its withdrawal UUID.
- **Cancel unprocessed payout** requires Trolley to confirm deletion of an open batch before releasing credits. It cannot cancel a processing or completed provider batch. If deletion or persistence is ambiguous, keep the reservation and review the original batch with Trolley.

Requests in `submitting` or `review` keep their credits reserved. Network errors, insufficient provider funding, invalid bank details, quote errors, or interrupted execution must not trigger a speculative refund or a new payout. A missing/ambiguous provider batch requires manual provider review. Webhooks plus the owner sync control provide reconciliation; no automatic scheduled payout worker is configured.

## Verification and remaining activation work

Automated checks cover the approved rate and amount bounds, exact API/widget signing, webhook authenticity and replay rejection, signed subscription validation, disabled-feature behavior, owner access, database ownership and debit rules, concurrent submission claims, shared gift/cash balance, duplicate/conflicting requests, stale status events, returned payments, cancellation, and recovery after a lost batch response.

Actual Trolley onboarding, sandbox execution, bank receipt, and live webhooks are unverified until account credentials are provided. Neither local nor Vercel configuration contained Trolley keys during integration. Keep withdrawals disabled until the account and payout routes are validated.

References: [API, payment lifecycle and webhooks](https://developers.trolley.com/api/), [embedded onboarding widget](https://developers.trolley.com/widget/), [payout network](https://trolley.com/platform/global-payout-network/).
