const SANDBOX_API_BASE = "https://testflight.tremendous.com/api/v2";

export type TremendousSandboxProduct = {
  id: string;
  name: string;
  category: string;
  currencyCodes: string[];
  countries: string[];
  denominations: Array<{ min: number; max: number; currencyCode: string | null }>;
};

function sandboxKey() {
  const key = process.env.TREMENDOUS_SANDBOX_API_KEY?.trim();
  if (!key) return null;
  if (!key.startsWith("TEST_")) {
    throw new Error("Tremendous sandbox requires a TEST_ API key.");
  }
  return key;
}

export function isTremendousSandboxConfigured() {
  return Boolean(process.env.TREMENDOUS_SANDBOX_API_KEY?.trim().startsWith("TEST_"));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseProduct(value: unknown): TremendousSandboxProduct | null {
  const product = asRecord(value);
  if (typeof product.id !== "string" || typeof product.name !== "string") return null;
  return {
    id: product.id,
    name: product.name,
    category: typeof product.category === "string" ? product.category : "",
    currencyCodes: asStringArray(product.currency_codes),
    countries: Array.isArray(product.countries)
      ? product.countries.map((entry) => asRecord(entry).abbr).filter((code): code is string => typeof code === "string")
      : [],
    denominations: Array.isArray(product.skus)
      ? product.skus.map((entry) => {
          const sku = asRecord(entry);
          return {
            min: typeof sku.min === "number" ? sku.min : NaN,
            max: typeof sku.max === "number" ? sku.max : NaN,
            currencyCode: typeof sku.currency_code === "string" ? sku.currency_code : null
          };
        }).filter((sku) => Number.isFinite(sku.min) && Number.isFinite(sku.max))
      : []
  };
}

export async function listTremendousSandboxProducts(countryCode: string) {
  if (!/^[A-Z]{2}$/.test(countryCode)) throw new Error("Invalid country code.");
  const key = sandboxKey();
  if (!key) throw new Error("Tremendous sandbox API key is not configured.");

  const url = new URL(`${SANDBOX_API_BASE}/products`);
  url.searchParams.set("country", countryCode);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Tremendous sandbox catalog request failed (${response.status}).`);
  const body = asRecord(await response.json());
  if (!Array.isArray(body.products)) throw new Error("Tremendous sandbox returned an invalid catalog.");
  return body.products.map(parseProduct).filter((product): product is TremendousSandboxProduct => product !== null);
}
