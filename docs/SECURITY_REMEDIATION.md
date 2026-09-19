# Requested security remediation — 19 September 2026

The requested fixes are implemented in the local working tree. They have **not been deployed**, and the production database has **not been migrated**. No commits or pushes were made. F06 uses Mergen-only verification destinations, as approved in the conversation.

## Changes

| Finding | Implemented behavior |
|---|---|
| F03 | Admin checks use immutable configured `ADMIN_USER_IDS`, or the confirmed email returned by Supabase Auth when no ID allowlist is configured. Editable profile email is never admin evidence. Profile role/email writes are revoked from browser roles. Auth email changes synchronize through a database trigger. Admin data loaders also require authorization. |
| F01 | Submission validates every answer against stored questions, ignores browser scores/credits, evaluates on the server, and returns the stored award. The UI no longer calls a scoring API or calculates an award fallback. Standard-survey timing starts with a server-recorded attempt. Direct client response/welcome-award writes are revoked. Retries return the original award. |
| F02/F05 | Reward redemption runs in one database transaction, locking the member while computing the complete balance and spending. Prices come from a server-only catalog. Requests require an idempotency key; retries cannot create a second activation or change its reward. Browser roles cannot insert reward costs or set fulfillment status. Success copy describes a pending request accurately. |
| F04 | The server checks audience eligibility from stored member/survey data. The private submission transaction locks the member and survey, checks both version timestamps, rechecks status/expiry/capacity, and inserts once. The last accepted response archives the survey in that transaction. The database denies direct browser insertion and invocation of the server-only transaction. |
| F20 | Local preview is disabled in production regardless of Host/forwarded headers. Development preview requires explicit opt-in and a real authorized admin session. |
| F07 | AI generation and evaluation require an authorized account. Standalone browser scoring is retired. Durable database budgets limit AI operations to 30 per user per UTC day and 1,000 globally per UTC day, with two concurrent operations per user and 60-second leases. Inputs and output-token allowances are bounded. Quota/storage failures fail closed. Report generation also uses the budget. |
| F11 | Historical surveys without an order keep their original entitlements. Owners cannot increase allowance/response targets, enable unpaid AI, replace questions/audience, extend the collection deadline, transfer ownership or reopen archived history. No historical invoices are repriced. |
| F12 | Next.js updated from 14.2.35 to 15.5.25 with corresponding ESLint configuration and asynchronous request APIs. Vulnerable transitive dependencies updated; explicit PostCSS and d3-color overrides retained. The resulting lockfile audit reports zero known vulnerabilities at verification time. |
| F13 | Checkout stores a validated complete survey draft before contacting Polar. Publication uses that immutable server snapshot. Browser returns, signed webhooks and cross-device recovery use idempotent publication. Webhook handling verifies signatures/timestamps, records processed event IDs, retries failures, and recovers interrupted checkout-link writes from provider metadata. Refund events atomically mark the payment for review and archive its survey; delayed paid events cannot reactivate it. The client dashboard has a payment-recovery section. |
| F15 | New signup requires explicit adult attestation and the current terms/privacy versions at the database boundary, with server-recorded consent time. Under-18 community age groups are rejected at signup/profile updates. Community API operations require a supported adult age group. Existing accounts are not falsely backfilled with new consent. |
| F06 | Email-verification return paths accept local Mergen paths only; external, protocol-relative, backslash and control-character destinations fall back to `/auth`. |
| F08 | Request bodies have byte limits and runtime type checks. Answer IDs/choices and model score/string arrays are validated. Nonnumeric/out-of-range AI scores produce a bounded server fallback instead of null awards. Invalid question-generation output is rejected, and AI failures use controlled errors/fallback behavior. |

The AI budget is deliberately finite and shared across server instances, not an in-memory limiter. It counts attempted operations, including provider failures; waiting/retrying after the daily reset does not alter an already persisted award. The existing 20–70 credit curve, 50-credit welcome award, reward prices, survey prices and $20 optional summary price remain unchanged.

## Verification

- `npm test`: **75 passed, 0 failed**. Includes actual PGlite SQL/RLS tests, migration reapplication, private function grants, role/email mutation rejection, direct financial-write rejection, last-slot behavior, expired surveys, reward retry/overspend prevention, refund replay, historical restrictions, consent and AI limits. Handler tests cover forged awards, audience rejection, invalid model outputs, redirects, admin identity, signed webhooks and durable-draft publication.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with no ESLint errors or warnings. Next 15 prints a deprecation notice for `next lint`; it is not a test failure.
- `npm run build`: passed on Next 15.5.25. The final browser-test build used synthetic Supabase values and empty provider credentials.
- `npm audit --json`: **0 vulnerabilities** across reported severities at verification time.
- Chrome smoke test: 10 public page/viewport combinations at 1440px and 390px; no uncaught page errors or horizontal overflow. Both interactive student 5-question/50-response examples showed **$52.50 with AI**.
- Running production-mode local server: anonymous AI/submission/reward/recovery requests returned **401**; local admin preview returned **404**, including a forged localhost-prefix forwarding header.

PGlite serializes its local work; Promise-based competing-request tests establish outcomes through the transaction API but are **not a substitute for a multi-connection PostgreSQL staging race test**. External payment/provider responses in automated tests were synthetic. No purchases, refunds, messages, rewards or live AI calls were made.

## Required rollout steps

1. Back up the database and use a short maintenance window for financial actions. Deploy this application and migration together: old browser bundles depend on the now-retired scoring/direct-write paths and should be refreshed.
2. Apply `supabase/migrate-survey-pricing-orders.sql` if it is not already installed, then apply **`supabase/migrate-prelaunch-security.sql` last**. The new migration is transactional and was tested twice on the same fixture. Do not rerun an older aggregate schema upgrade after it without reapplying security: old scripts can recreate permissive policies.
3. Retain the server-only Supabase service-role key. It is now required for submission, reward and AI-budget transactions. Never expose it as a `NEXT_PUBLIC_` variable.
4. Prefer configuring **`ADMIN_USER_IDS`** to the intended Supabase Auth UUIDs. When set, it takes precedence over email allowlists. Test the intended admin and a normal client/member before opening access. Leave `ENABLE_LOCAL_ADMIN_PREVIEW=false` in production.
5. In Polar, create/configure the endpoint **`https://mergen-ai.com/api/polar/webhook`**, subscribe to **`checkout.updated`, `order.paid`, `order.refunded`**, and set **`POLAR_WEBHOOK_SECRET`** to that endpoint's signing secret. Provider dashboard configuration was not changed by this task.
6. Verify the existing external survey-distribution scheduler. A survey published by a payment webhook is ready for distribution even if the browser never returns; the scheduler must run to send invitations. Notification delivery itself was not redesigned in this scope.
7. In sandbox/staging, verify signup/confirmation, ordinary profile edits, admin access, every answer type, two simultaneous final-slot submissions, same-balance redemptions from separate DB connections, interrupted checkout, signed webhook retry, cross-device recovery and full/partial refund. Partial refunds conservatively archive and flag the order for owner review; no automated refund issuance or participant-credit clawback was added.
8. Inspect historical roles, awards, balances and redemptions for abuse before enabling rewards. The migration synchronizes profile emails with Auth, but does not guess original roles or reverse potentially fraudulent historical money/credits. Existing accounts lacking adult/consent evidence need owner review; consent was not invented for them.

New recoverable drafts are stored from this release forward. Older payments with no stored draft still need support reconciliation; their original amounts are preserved. Recovery lists the latest 20 linked, unpublished orders; historical support can use the authenticated checkout reference directly. Webhook retry records contain event IDs/types, not full personal/payment payloads.

## Operational limits and remaining scope

Production protection is conditional on applying the migration, deploying the code and configuring the webhook. This document is not a public-launch approval. Audit findings outside the requested list, including CSV/upload handling, broader accessibility, privacy operations and distribution/pagination reliability, are not claimed resolved here. Real backup restoration, live provider delivery, the hosted database grants and end-to-end production behavior remain unverified.

Do not roll back only the application to a version that trusts browser credit awards. If deployment fails, keep financial actions unavailable while repairing the release; restoring permissive financial grants would reopen the original vulnerabilities.
