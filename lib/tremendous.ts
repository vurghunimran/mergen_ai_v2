import { parseTremendousProduct, type TremendousProduct } from "@/lib/tremendous-sandbox";

export type TremendousMode = "production" | "sandbox";
export type { TremendousProduct };

export function tremendousMode(): TremendousMode {
  return process.env.TREMENDOUS_MODE === "sandbox" ? "sandbox" : "production";
}

function apiKey(mode: TremendousMode) {
  const key = process.env[mode === "production" ? "TREMENDOUS_API_KEY" : "TREMENDOUS_SANDBOX_API_KEY"]?.trim();
  if (!key || !key.startsWith(mode === "production" ? "PROD_" : "TEST_")) {
    throw new Error(`Tremendous ${mode} credentials are not configured correctly.`);
  }
  return key;
}

export function isTremendousConfigured(mode = tremendousMode()) {
  try { apiKey(mode); return true; } catch { return false; }
}

// Read-only provider access. Member ordering remains closed until the live catalog,
// pricing, durable fulfillment and support process have been approved and implemented.
export async function tremendousGet<T>(path: string, mode = tremendousMode()): Promise<T> {
  const key = apiKey(mode);
  const base = mode === "production" ? "https://api.tremendous.com/api/v2" : "https://testflight.tremendous.com/api/v2";
  const response = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    cache: "no-store", signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error(`Tremendous ${mode} request failed (${response.status}).`);
  return await response.json() as T;
}

export async function listTremendousProducts(country: string, mode = tremendousMode()) {
  if (!/^[A-Z]{2}$/.test(country)) throw new Error("Invalid country code.");
  const result = await tremendousGet<{ products: unknown[] }>(`/products?country=${encodeURIComponent(country)}`, mode);
  if (!Array.isArray(result.products)) throw new Error("Tremendous returned an invalid catalog.");
  return result.products.map(parseTremendousProduct).filter((product): product is TremendousProduct => product !== null);
}
