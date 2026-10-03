# Member reward catalog

The member Rewards page shows a small, country-specific set of real Tremendous merchant gift cards and a cash withdrawal card in one grid. Mergen's existing categories filter both types. Search matches brand, category, and issued currency, including cash and bank transfer. Cash setup, history and payout actions open in a dialog when withdrawals are enabled.

Every gift has a $5 USD face value, converted to its supported issued currency at the snapshot exchange rate, with rounding to that currency's minor unit. Credit prices vary between 420 and 920 based on predicted demand. Cash requests are fixed at 920 credits for $10 USD and the server rejects larger new requests. Both providers remain subject to the existing release gates; browsing does not authorize redemption.

`scripts/curate-reward-catalog.py` reads the official public catalog and CSV value options, then produces `lib/data/curated-rewards.json`. It never uses account credentials or places orders. The snapshot contains up to 12 products per country and up to four per category. Some countries have fewer or no qualifying products.

Selection and pricing combine 80% provider catalog popularity with a 20-point editorial preference for familiar international and local brands. The resulting 0–100 score is rounded to the nearest demand tier: 0, 20, 40, 60, 80 or 100, priced at 420, 520, 620, 720, 820 or 920 credits respectively. Higher predicted demand requires more credits. This is an editorial demand estimate, not a measured Mergen redemption count, usage percentage, or market share. Real member usage data does not yet exist. Example prices: Amazon.com 920, Razer Gold USD 820, FreeFire USD 620. All retain the same $5 value.

The generator excludes monetary payouts, prepaid cards, charities, export-only products, products requiring additional value-range approval, and products whose supported denominations cannot deliver the $5 value. Product IDs and country coverage must agree between the public metadata and export. A missing category stays empty: do not reintroduce the old illustrative Notion, Coursera, or other unlisted subscriptions as fulfillable rewards.

Run `python3 scripts/curate-reward-catalog.py` to refresh proposals and exchange rates, review the resulting diff, then run the tests and build. Currency values are dated proposals, not guaranteed future provider settlement rates. The member screen attributes Exchange Rate API. No raw exchange-rate table is redistributed to the browser.

Before enabling gifts, verify the approved production account catalog, supported value and currency precision, provider costs and availability, implement durable fulfillment and credit debiting against these product IDs, and approve the final prices. The legacy activation endpoint remains closed and is not the checkout path for this browsing snapshot.

Sources:

- https://www.tremendous.com/catalog/
- https://api.tremendous.com/catalog-file.csv?charities=true
- https://www.exchangerate-api.com/docs/free
