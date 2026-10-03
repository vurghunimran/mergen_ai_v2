# Production integrations

Updated 2026-10-03. Site: https://mergen-ai.com.

## Tremendous

- Production catalog API: https://api.tremendous.com/api/v2.
- `TREMENDOUS_MODE=production`; `TREMENDOUS_API_KEY` must begin with `PROD_`.
- Sandbox is a separate account and catalog. `TEST_` keys are refused by the production client.
- Tremendous must approve the production account/API access before a live key can be issued: https://developers.tremendous.com/docs/production-api-access.
- Add the approved live key in Vercel Production, then redeploy. The owner catalog reads real products; the integrations page checks production funding-source access.
- Gift redemption remains disabled at the owner's request. Select products, denominations, countries, credit pricing, and fees before implementing durable order fulfillment and reconciliation. The former illustrative gift catalog is not a production offer. Do not flip `REWARD_REDEMPTION_ENABLED` alone.

## Trolley

- Mergen's integration does not create a Trolley business account. Register the merchant account and complete Trolley's business verification and funding process.
- Add `TROLLEY_LIVE_ACCESS_KEY`, `TROLLEY_LIVE_SECRET_KEY`, and `TROLLEY_LIVE_WEBHOOK_SECRET` in Vercel Production.
- `TROLLEY_MODE=live`; member payouts still require `TROLLEY_WITHDRAWALS_ENABLED=true` and a reviewed `TROLLEY_ALLOWED_COUNTRIES` allowlist.
- Set the production webhook to https://mergen-ai.com/api/trolley/webhook and configure payment-status events.
- Verify funding, routes, minimums, fees, onboarding, tax/KYC readiness and a real $10 payout before enabling member withdrawals. The readiness check confirms only credential access and a positive funding balance, not funding sufficiency for every withdrawal.
- Approved cash amount: exactly 920 credits = $10 USD per new withdrawal. Gift catalog pricing is 420 credits for $5 USD, converted to the supported local currency; fulfillment remains disabled. See `docs/trolley-withdrawals.md` and `docs/curated-member-rewards.md` for details.

## Polar

- `POLAR_SERVER=production`; live host https://api.polar.sh.
- `POLAR_ACCESS_TOKEN` must authorize checkout creation and checkout reads. Set `POLAR_SURVEY_PRODUCT_ID` to an active one-time product.
- Inspection also needs `products:read` and `webhooks:read` (or corresponding write scopes). A 403 during inspection is not proof that checkout scopes fail.
- Production webhook: https://mergen-ai.com/api/polar/webhook, enabled for `checkout.updated`, `order.paid`, and `order.refunded`.
- The endpoint signing secret must match `POLAR_WEBHOOK_SECRET` (preferred) or the legacy `POLAR_WEBHOOK` variable. Do not rotate an active secret without updating both sides.
- Verify a real checkout, durable survey fulfillment, duplicate-event handling and refund reconciliation before declaring the payment flow fully validated.

## Other services

- Supabase auth is configured with the production site URL, email confirmation and custom SMTP. The readiness page checks server database access without exposing member rows.
- Resend's `mergen-ai.com` domain was verified for sending and receiving during the audit. Domain verification does not establish delivery to a specific inbox.
- The available Gemini key can access `gemini-2.5-flash`; generation quotas and billing still need operational validation.
- Telegram's token is stored as a non-exportable production secret. The deployed owner check reads bot webhook state. It does not send a message or reset the webhook.
- The staged survey scheduler is not configured. The audited Vercel plan is Hobby, which cannot run hourly cron. Set a strong `CRON_SECRET`, then configure an external hourly scheduler with `Authorization: Bearer <secret>` for `GET https://mergen-ai.com/api/cron/survey-distribution`, or use hourly Vercel cron on a supported plan. Never publish the scheduler secret. Upgrade/subscription purchase has not been performed.

## Deployment checks

`/dashboard/admin/integrations` and `/api/admin/integrations` are protected by the verified owner identity, use no-store responses, and inspect deployed credentials. They distinguish verified provider access, incomplete setup and failed/unavailable inspection. They never create a payment, checkout, reward order or message.

Adding or changing a Vercel variable requires a new production deployment. Do not declare withdrawals or gift delivery live merely because the production mode is selected.
