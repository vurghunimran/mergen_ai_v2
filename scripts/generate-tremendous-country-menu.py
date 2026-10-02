"""Refresh the owner-only country menu from Tremendous's public catalog CSV."""

import csv
import io
import json
import subprocess
import urllib.request
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
CATALOG_URL = "https://api.tremendous.com/catalog-file.csv?charities=true"
CATALOG_COUNTRY_NAMES = {
    "United States": "USA",
    "Georgia": "Georgia (Sakartvelo)",
    "United Arab Emirates": "UAE",
    "Tanzania": "Tanzania, United Republic Of",
}
PROHIBITED = {"Iran", "Iraq", "Ukraine"}
GIFT_PREFERENCES = ("Amazon", "Uber", "Carrefour", "Decathlon", "Walmart", "Steam", "Razer", "FreeFire")
MONETARY_PREFIXES = (
    "Bank Transfer", "PayPal", "Cash App", "Instant Debit Transfer", "Venmo",
    "GCash", "Gopay", "GoPay", "LinkAja", "DANA", "Ovo Cash",
    "ShopeePay", "TrueMoney", "Naver Pay", "Teen Cash", "Teencash",
    "Ví MoMo", "Alipay",
)


def unique_rows(rows):
    return list({row["ID"]: row for row in rows}.values())


def gift_sort_key(row):
    name = row["Product"].strip()
    return (next((i for i, prefix in enumerate(GIFT_PREFERENCES) if name.startswith(prefix)), 99), name.casefold())


def cell(value):
    return value.replace("|", "/").replace("\n", " ")


def main():
    countries = json.loads(subprocess.check_output(
        ["node", "-e", "process.stdout.write(JSON.stringify(require('./lib/community-distribution.ts').communityLaunchCountries))"],
        cwd=ROOT,
        text=True,
    ))
    with urllib.request.urlopen(CATALOG_URL, timeout=30) as response:
        records = list(csv.DictReader(io.StringIO(response.read().decode("utf-8-sig"))))
    by_country = defaultdict(list)
    for record in records:
        by_country[record["Country"]].append(record)

    date = datetime.now(ZoneInfo("Asia/Baku")).date().isoformat()
    lines = [
        "# MERGEN country-by-country reward menu",
        "",
        f"Public Tremendous catalog snapshot: {date}. Source: [Tremendous catalog CSV]({CATALOG_URL}). This is an **owner review menu**, not a member offer or production availability guarantee.",
        "",
        "The table covers every country currently allowed by MERGEN community signup. Gift-card examples are locally listed products, not necessarily valid at the proposed 500-credit / $5 sandbox amount: local-currency conversion and denomination limits must be checked in the live account. 'Virtual Visa' means spending card, not cash withdrawal. Monetary options may require business verification and fees. The member-facing catalog and redemption remain closed until account-specific production availability, funding, credit price, and delivery are tested.",
        "",
        "| Country | Gift-card examples | Virtual Visa | Monetary payout candidates | Review status |",
        "|---|---|---|---|---|",
    ]
    for country in countries:
        records_for_country = by_country.get(CATALOG_COUNTRY_NAMES.get(country, country), [])
        unrestricted = [row for row in records_for_country if not row["Restrictions"].strip()]
        gifts = sorted(unique_rows(row for row in unrestricted if row["Gift card category"].strip()), key=gift_sort_key)
        gift_names = ", ".join(row["Product"].strip() for row in gifts[:3]) or "—"
        virtual_visa = "Yes" if any(row["Product"] == "Virtual Visa" for row in unrestricted) else "—"
        monetary = unique_rows(
            row for row in records_for_country
            if not row["Gift card category"].strip()
            and row["Product"].startswith(MONETARY_PREFIXES)
            and (not row["Restrictions"].strip() or row["Restrictions"].strip() == "Requires complete business information.")
        )
        monetary_names = ", ".join(row["Product"].strip() for row in monetary) or "—"
        if country in PROHIBITED:
            status = "Tremendous prohibits rewards"
        elif not records_for_country:
            status = "No public catalog entry"
        elif gift_names == "—" and virtual_visa == "—" and monetary_names == "—":
            status = "No usable candidate identified"
        else:
            status = "Candidate — verify amount and account access"
        lines.append("| " + " | ".join(map(cell, (country, gift_names, virtual_visa, monetary_names, status))) + " |")

    lines += [
        "",
        "Tremendous currently lists [country restrictions](https://help.tremendous.com/hc/en-us/articles/39975757948947-Are-there-any-restrictions-on-who-can-receive-a-Tremendous-reward) and [product-specific geography, currency, and amount limits](https://developers.tremendous.com/reference/products). A blank public catalog does not establish that a person is prohibited; it means MERGEN has no Tremendous option to approve from this snapshot. Bank transfers and other monetary payouts may require [business information and fees](https://help.tremendous.com/hc/en-us/articles/41472317536787-Monetary-reward-options).",
        "",
    ]
    output = ROOT / "docs" / "tremendous-country-reward-menu.md"
    output.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {len(countries)} countries to {output}")


if __name__ == "__main__":
    main()
