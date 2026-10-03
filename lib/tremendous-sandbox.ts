const SANDBOX_API_BASE = "https://testflight.tremendous.com/api/v2";

export type TremendousProduct = {
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

export type TremendousSandboxProduct = TremendousProduct;

export function parseTremendousProduct(value: unknown): TremendousProduct | null {
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
  return body.products.map(parseTremendousProduct).filter((product): product is TremendousSandboxProduct => product !== null);
}

// Internal test helper only. This does not reserve or debit MERGEN member credits.
export async function sendTremendousSandboxEmailTest(input: {
  countryCode: string;
  productId: string;
  recipientName: string;
  recipientEmail: string;
  externalId: string;
}) {
  const { countryCode, productId, recipientName, recipientEmail, externalId } = input;
  if (!/^[A-Z]{2}$/.test(countryCode) || !/^[A-Z0-9]{4,20}$/.test(productId) ||
      !recipientName.trim() || recipientName.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail) ||
      !/^[A-Za-z0-9_-]{1,80}$/.test(externalId)) {
    throw new Error("Invalid sandbox test reward details.");
  }
  const key = sandboxKey();
  if (!key) throw new Error("Tremendous sandbox API key is not configured.");
  const product = (await listTremendousSandboxProducts(countryCode)).find((entry) => entry.id === productId);
  if (!product?.countries.includes(countryCode) ||
      !product.denominations.some((sku) => sku.currencyCode === "USD" && sku.min <= 5 && sku.max >= 5)) {
    throw new Error("This product is not listed for the country at $5 USD.");
  }

  const response = await fetch(`${SANDBOX_API_BASE}/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      external_id: externalId,
      payment: { funding_source_id: "BALANCE" },
      reward: {
        value: { denomination: 5, currency_code: "USD" },
        delivery: {
          method: "EMAIL",
          meta: {
            subject_line: "Your MERGEN community reward test",
            message: "This is a sandbox preview of a MERGEN community reward. It has no real monetary value. Thank you for helping us test the experience."
          }
        },
        recipient: { name: recipientName.trim(), email: recipientEmail.trim() },
        products: [productId]
      }
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Tremendous sandbox order failed (${response.status}).`);
  const order = asRecord(asRecord(await response.json()).order);
  if (typeof order.id !== "string") throw new Error("Tremendous sandbox returned an invalid order.");
  const reward = Array.isArray(order.rewards) ? asRecord(order.rewards[0]) : {};
  const delivery = asRecord(reward.delivery);
  return {
    orderId: order.id,
    status: typeof order.status === "string" ? order.status : null,
    rewardId: typeof reward.id === "string" ? reward.id : null,
    deliveryStatus: typeof delivery.status === "string" ? delivery.status : null
  };
}
