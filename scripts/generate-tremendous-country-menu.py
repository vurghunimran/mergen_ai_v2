"""Refresh MERGEN's owner-only country menu from its Tremendous sandbox account."""

import json
import os
import re
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
API_URL = "https://testflight.tremendous.com/api/v2/products"
GIFT_PREFERENCES = ("Amazon", "Uber", "Carrefour", "Decathlon", "Walmart", "Steam", "Razer", "FreeFire")
PAYOUT_CATEGORIES = {"ach", "international_bank", "instant_debit_transfer", "paypal", "venmo", "cash_app", "wallet"}
PROHIBITED = {"Iran", "Iraq", "Ukraine"}


def sandbox_key():
    key = os.environ.get("TREMENDOUS_SANDBOX_API_KEY", "").strip()
    if not key:
        env_file = ROOT / ".env.local"
        if env_file.exists():
            key = next((line.partition("=")[2].strip().strip("\"'") for line in env_file.read_text().splitlines()
                        if line.startswith("TREMENDOUS_SANDBOX_API_KEY=")), "")
    if not key.startswith("TEST_"):
        raise SystemExit("A TEST_ Tremendous sandbox key is required in .env.local or the environment.")
    return key


def community_countries():
    source = (ROOT / "lib" / "community-reward-countries.ts").read_text()
    mapping = source.split("const countryCodes = {", 1)[1].split("} satisfies", 1)[0]
    pairs = [(quoted or bare, code) for quoted, bare, code in
             re.findall(r'(?:(?:"([^"]+)")|([A-Za-z]+)):\s*"([A-Z]{2})"', mapping)]
    if len(pairs) != 62 or len(set(code for _, code in pairs)) != len(pairs):
        raise SystemExit("The community country mapping needs review before catalog refresh.")
    return pairs


def cell(value):
    return value.replace("|", "/").replace("\n", " ")


def gift_sort_key(product):
    name = product["name"]
    return (next((i for i, prefix in enumerate(GIFT_PREFERENCES) if name.startswith(prefix)), 99), name.casefold())


def main():
    countries = community_countries()
    query = urllib.parse.urlencode({"country": ",".join(code for _, code in countries)})
    request = urllib.request.Request(f"{API_URL}?{query}", headers={
        "Authorization": f"Bearer {sandbox_key()}", "Accept": "application/json"
    })
    with urllib.request.urlopen(request, timeout=30) as response:
        products = json.load(response).get("products")
    if not isinstance(products, list):
        raise SystemExit("Tremendous returned an invalid product catalog.")

    by_country = defaultdict(list)
    supported_codes = {code for _, code in countries}
    for product in products:
        for entry in product.get("countries", []):
            code = entry.get("abbr") if isinstance(entry, dict) else None
            if code in supported_codes:
                by_country[code].append(product)

    date = datetime.now(ZoneInfo("Asia/Baku")).date().isoformat()
    lines = [
        "# MERGEN country-by-country reward menu",
        "",
        f"Tremendous **sandbox account** catalog snapshot: {date}. Source: the authenticated [Tremendous products API]({API_URL}). This is an **owner review menu**, not a member offer or production availability guarantee.",
        "",
        "The table covers all 62 MERGEN community countries. Products are listed for a recipient country, but merchant usage terms, local currency, denomination, account access, fees, and $5 test suitability must be checked before selecting a reward. Virtual Visa is a spending card, not cash withdrawal. The member-facing catalog and redemption remain closed until production availability, funding, credit pricing, and delivery are tested.",
        "",
        "| Country | Sandbox products | Gift-card examples | Virtual Visa | Monetary payout candidates | Review status |",
        "|---|---:|---|---|---|---|",
    ]
    for country, code in countries:
        available = by_country[code]
        gifts = sorted((product for product in available if product.get("category") == "merchant_card"), key=gift_sort_key)
        gift_names = ", ".join(product["name"] for product in gifts[:3]) or "—"
        visa = "Yes" if any(product.get("category") == "visa_card" for product in available) else "—"
        payouts = sorted({product["name"] for product in available if product.get("category") in PAYOUT_CATEGORIES})
        payout_names = ", ".join(payouts) or "—"
        if country in PROHIBITED:
            status = "Tremendous prohibits rewards"
        elif not available:
            status = "No sandbox catalog entry"
        elif not gifts and visa == "—" and not payouts:
            status = "No gift or payout candidate"
        else:
            status = "Candidate — verify terms and amount"
        lines.append("| " + " | ".join(map(cell, (country, str(len(available)), gift_names, visa, payout_names, status))) + " |")

    lines += [
        "",
        "Tremendous lists [country restrictions](https://help.tremendous.com/hc/en-us/articles/39975757948947-Are-there-any-restrictions-on-who-can-receive-a-Tremendous-reward) and [product-specific geography, currency, and amount limits](https://developers.tremendous.com/reference/products). A sandbox listing does not establish production approval or a usable $5 denomination. Bank transfers and other monetary payouts may require [business information and fees](https://help.tremendous.com/hc/en-us/articles/41472317536787-Monetary-reward-options).",
        "",
    ]
    output = ROOT / "docs" / "tremendous-country-reward-menu.md"
    output.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {len(countries)} countries from {len(products)} sandbox products to {output}")


if __name__ == "__main__":
    main()
