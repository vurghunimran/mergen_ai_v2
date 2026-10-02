# MERGEN rewards — Tremendous sandbox setup

The sandbox is for internal testing only. Member redemption remains disabled in `lib/reward-availability.ts`. No sandbox product is a promised live reward.

## Account and campaign

1. Use the Tremendous **sandbox** account registered with `team@mergen-ai.com`. Keep its login credentials private.
2. Create a sandbox API key in Team settings → Developers. Keep the `TEST_` key out of Git and browser code. Set `TREMENDOUS_SANDBOX_API_KEY` only in the server environment. As of 2026-10-02, the key is stored as a Vercel Production Secret, and a separate local copy passed the sandbox ping and country catalog API checks.
3. In the owner admin panel, open `/dashboard/admin/rewards`. Choose any of MERGEN's supported community countries and review the live sandbox catalog, including the product's currency and denomination limits. The authenticated raw preview is `/api/admin/rewards/tremendous-catalog?country=PL` (change the two-letter country code as needed). Use the [country review menu](tremendous-country-reward-menu.md) as an initial shortlist only. A missing product or unsuitable denomination must not be advertised.
4. No campaign is required for a single-product reward. After choosing a product ID from the live catalog, a sandbox order can specify that ID directly in `reward.products`. Do not use an unreviewed full-catalog rule. Tremendous gift cards are stored-value rewards, not merchant percentage-discount codes.
5. Test fake-money orders only with an address controlled by MERGEN, using `external_id` to make retries idempotent. Confirm email delivery, country suitability, credit reservation, and failure handling before any live redemption is considered.

The approved **test** conversion is 500 MERGEN credits = a $5 reward. For gift cards denominated in local currency, check the provider's actual conversion and SKU before selecting a product. This does not set live credit pricing. The live sandbox returned products in 59 of MERGEN's 62 countries on 2026-10-02; Iran, Iraq, and Ukraine returned none.

On 2026-10-02, a direct $5 USD Razer Gold sandbox order for Azerbaijan succeeded with `LINK` delivery and a MERGEN-controlled test recipient. Tremendous returned order `V7W88CRMXJNB` as `EXECUTED`. Repeating the exact request with external ID `MERGEN-SANDBOX-AZ-500C-20261002` returned the same order with HTTP 201, confirming idempotency. No reward email was sent; member credit debiting, member delivery, and merchant redemption were not tested.

An owner-requested follow-up used MERGEN's server-side sandbox helper to create another $5 USD Razer Gold order with `EMAIL` delivery to an owner-controlled Gmail inbox. Order `ZGCXWT5Z786C` was `EXECUTED`; reward `YXHH985VFXNR` subsequently reported delivery `SUCCEEDED`. This proves Tremendous accepted and delivered the sandbox email, but does not verify inbox placement or merchant redemption. No member credits were debited; the public redemption flow remains closed.

## Production boundary

The production account, funding balance, production API approval, partner agreements, and live credit pricing are separate decisions. Never use a `PROD_` key in the sandbox preview. Keep `REWARD_REDEMPTION_ENABLED` false until verified products and fulfillment are in place. A successful Tremendous order is not proof that the recipient has used the merchant code; email delivery and merchant redemption are different states.

References: [sandbox setup](https://developers.tremendous.com/docs/1-create-a-sandbox-account), [catalog API](https://developers.tremendous.com/reference/list-products), [single-product rewards](https://developers.tremendous.com/docs/creating-single-product-rewards), [order API](https://developers.tremendous.com/reference/create-order), [webhooks](https://developers.tremendous.com/docs/webhooks-1).
