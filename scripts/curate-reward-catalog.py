"""Build the coming-soon member catalog from public provider data, never account credentials."""
import csv
import io
import json
import math
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
CATALOG_URL = "https://www.tremendous.com/catalog/"
EXPORT_URL = "https://api.tremendous.com/catalog-file.csv?charities=true"
FX_URL = "https://open.er-api.com/v6/latest/USD"


def get(url):
    return urllib.request.urlopen(url, timeout=45).read().decode("utf-8-sig")


def public_metadata(html):
    chunks = []
    for script in re.findall(r"<script[^>]*>(.*?)</script>", html, re.S):
        if script.startswith("self.__next_f.push("):
            try:
                value = json.loads(script[len("self.__next_f.push("):-1])
                if value[0] == 1:
                    chunks.append(value[1])
            except (ValueError, IndexError):
                pass
    flight = "".join(chunks)
    decoder = json.JSONDecoder()
    products = {}
    for match in re.finditer(r'\{"category":', flight):
        try:
            product, _ = decoder.raw_decode(flight[match.start():])
            if all(key in product for key in ["id", "name", "countries", "currency_codes"]):
                products[product["id"]] = product
        except ValueError:
            pass
    if len(products) < 100:
        raise ValueError("Public catalog metadata could not be parsed. Preserve the existing snapshot.")
    return products


def category(name):
    patterns = [
        ("productivity_and_research_tools", r"\b(notion|grammarly|canva|evernote|google workspace|microsoft office)\b"),
        ("education_and_learning_platforms", r"\b(udemy|coursera|duolingo|babbel|skillshare|barnes.*noble|booktopia|books|kobo|audible)\b"),
        ("gaming_companies", r"\b(steam|playstation|xbox|nintendo|razer|roblox|riot|pubg|freefire|free fire|league of legends|valorant|minecraft|epic games|battle.net|garena)\b"),
        ("streaming_and_digital_services", r"\b(netflix|spotify|youtube|twitch|deezer|hulu|disney\+|rakuten tv|apple tv|crunchyroll)\b"),
        ("tech_and_software", r"^apple(?:\s|$)|\b(google play|microsoft|adobe|samsung|best buy|currys|mediamarkt|media markt|electronics|google one|fnac)\b"),
    ]
    for id, pattern in patterns:
        if re.search(pattern, name, re.I):
            return id
    return "lifestyle_and_everyday_brands"


def brand(name):
    familiar = ["amazon", "apple", "google play", "microsoft", "steam", "playstation", "xbox", "nintendo", "netflix", "spotify", "starbucks", "uber", "airbnb", "walmart", "target", "carrefour", "decathlon", "ikea", "nike", "adidas", "sephora", "h&m", "zara", "razer", "roblox", "freefire", "free fire", "babbel", "barnes", "best buy", "doordash", "grab", "rakuten", "flipkart", "bigbasket", "swiggy", "zomato", "shopee", "lazada", "tokopedia", "jollibee", "trendyol", "migros", "careem", "noon", "panda", "kfc", "mcdonald"]
    for known in familiar:
        if name.lower().startswith(known) and not (known == "apple" and name.lower().startswith("applebee")):
            return known, 1.0
    return name.lower(), 0.0


def credit_price(selection_score):
    # Six credit tiers. Familiarity and provider popularity estimate demand;
    # they do not change the $5 face value or represent measured member usage.
    score = max(0, min(100, selection_score))
    return 420 + 100 * math.floor(score / 20 + 0.5)


def offer(row, rates):
    currency = row["Currency"]
    rate = rates.get(currency)
    if not isinstance(rate, (int, float)) or rate <= 0 or row["Restrictions"]:
        return None
    text = row["Denominations"]
    continuous = re.fullmatch(r"Min:\s*([\d.]+),\s*Max:\s*([\d.]+)", text)
    # Every gift has a $5 USD face value, converted once at the snapshot rate.
    digits = 0 if currency in {"JPY", "KRW", "VND", "CLP", "PYG", "XOF", "XAF"} else 2
    amount = round(5 * rate, digits)
    if continuous:
        lower, upper = map(float, continuous.groups())
        if lower <= 0 or upper < lower:
            return None
        if amount < lower or amount > upper:
            return None
    else:
        values = [float(v.strip()) for v in text.split(",") if re.fullmatch(r"\d+(?:\.\d+)?", v.strip())]
        if not values:
            return None
        if amount not in values:
            return None
    equivalent = amount / rate
    if equivalent <= 0:
        return None
    return {"value": amount, "currency": currency, "usdValue": 5, "credits": 420}


def main():
    metadata = public_metadata(get(CATALOG_URL))
    rows = list(csv.DictReader(io.StringIO(get(EXPORT_URL))))
    fx = json.loads(get(FX_URL))
    if fx.get("result") != "success" or fx.get("base_code") != "USD":
        raise ValueError("Exchange rates are unavailable. Preserve the existing snapshot.")
    countries_source = (ROOT / "lib/community-reward-countries.ts").read_text()
    pairs = re.findall(r'(?:(?:"([^"]+)")|(?:\b([A-Za-z]+))): "([A-Z]{2})"', countries_source)
    countries = [{"name": a or b, "code": c} for a, b, c in pairs]
    assert len(countries) == 62
    aliases = {"United States": "USA", "United Arab Emirates": "UAE", "Georgia": "Georgia (Sakartvelo)", "Tanzania": "Tanzania, United Republic Of"}
    output = []
    for country in countries:
        candidates = {}
        for row in rows:
            product = metadata.get(row["ID"])
            if row["Country"] != aliases.get(country["name"], country["name"]) or not product or product["category"] != "merchant_cards" or country["code"] not in product["countries"]:
                continue
            price = offer(row, fx["rates"])
            if not price:
                continue
            name = row["Product"].strip()
            group, familiarity = brand(name)
            popularity = product.get("popularity_score", 0)
            popularity = popularity if isinstance(popularity, (int, float)) and math.isfinite(popularity) else 0
            # Popularity is a provider ranking proxy, never a redemption count or market-share percentage.
            score = popularity * 0.8 + familiarity * 20
            entry = {"id": f"{row['ID']}:{country['code']}:{price['currency']}", "productId": row["ID"], "company": name, "category": category(name), "imageUrl": product["card_image_path"], **price, "selectionScore": round(score, 4), "providerPopularity": round(popularity, 4), "brandGroup": group}
            entry["credits"] = credit_price(entry["selectionScore"])
            if row["ID"] not in candidates or entry["selectionScore"] > candidates[row["ID"]]["selectionScore"]:
                candidates[row["ID"]] = entry
        ranked = sorted(candidates.values(), key=lambda entry: (-entry["selectionScore"], entry["company"]))
        picked = []
        groups = set()
        category_counts = {}
        # Four per category keeps a small catalog useful without inventing missing local options.
        for entry in ranked:
            if entry["brandGroup"] in groups or category_counts.get(entry["category"], 0) >= 4:
                continue
            picked.append(entry)
            groups.add(entry["brandGroup"])
            category_counts[entry["category"]] = category_counts.get(entry["category"], 0) + 1
            if len(picked) == 12:
                break
        for entry in picked:
            del entry["brandGroup"]
        output.append({**country, "rewards": picked})
    from datetime import datetime, timezone
    result = {"version": 1, "catalogDate": datetime.now(timezone.utc).date().isoformat(), "fxDate": datetime.fromtimestamp(fx["time_last_update_unix"], timezone.utc).date().isoformat(), "pricingStatus": "draft", "minimumGiftCredits": 420, "maximumGiftCredits": 920, "creditTiers": [420, 520, 620, 720, 820, 920], "giftUsdValue": 5, "cashCredits": 920, "cashUsdValue": 10, "maxRewardsPerCountry": 12, "sources": {"catalog": CATALOG_URL, "values": EXPORT_URL, "exchangeRates": "https://www.exchangerate-api.com", "popularityMeaning": "Provider catalog popularity proxy; not member usage statistics"}, "countries": output}
    destination = ROOT / "lib/data/curated-rewards.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"countryOffers": sum(len(c["rewards"]) for c in output), "uniqueProducts": len({r["productId"] for c in output for r in c["rewards"]}), "countriesWithRewards": sum(bool(c["rewards"]) for c in output), "categories": sorted({r["category"] for c in output for r in c["rewards"]}), "examples": {c["code"]: [r["company"] for r in c["rewards"]] for c in output if c["code"] in ["US", "NL", "DE", "AZ", "TR", "IN"]}}, ensure_ascii=False))


if __name__ == "__main__":
    main()
