type PolarServerMode = "production" | "sandbox";

type CreatePolarCheckoutInput = {
  amountInCents: number;
  customerEmail: string;
  customerName: string;
  externalCustomerId: string;
  metadata: Record<string, string>;
  origin: string;
};

type PolarCheckoutResponse = {
  id: string;
  url: string;
  status: "open" | "expired" | "confirmed" | "succeeded" | "failed";
  amount: number;
  total_amount: number;
  currency: string;
  external_customer_id: string | null;
  metadata: Record<string, string>;
};

function getPolarServerMode(): PolarServerMode {
  return process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production";
}

function getPolarApiBaseUrl() {
  return getPolarServerMode() === "sandbox" ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";
}

function getPolarAccessToken() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("Missing POLAR_ACCESS_TOKEN.");
  }

  return accessToken;
}

function getPolarSurveyProductId() {
  const productId = process.env.POLAR_SURVEY_PRODUCT_ID;

  if (!productId) {
    throw new Error("Missing POLAR_SURVEY_PRODUCT_ID.");
  }

  return productId;
}

async function polarRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${getPolarApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getPolarAccessToken()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Polar API request failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as T;
}

export async function createPolarCheckout(input: CreatePolarCheckoutInput) {
  const productId = getPolarSurveyProductId();

  return polarRequest<PolarCheckoutResponse>("/v1/checkouts/", {
    method: "POST",
    body: JSON.stringify({
      products: [productId],
      prices: {
        [productId]: [
          {
            amount_type: "fixed",
            price_amount: input.amountInCents,
            price_currency: "usd"
          }
        ]
      },
      customer_email: input.customerEmail,
      customer_name: input.customerName,
      external_customer_id: input.externalCustomerId,
      success_url: `${input.origin}/dashboard/client?polar_checkout_id={CHECKOUT_ID}&payment=success`,
      return_url: `${input.origin}/dashboard/client?payment=cancelled`,
      metadata: input.metadata
    })
  });
}

export async function getPolarCheckout(checkoutId: string) {
  return polarRequest<PolarCheckoutResponse>(`/v1/checkouts/${checkoutId}`, {
    method: "GET"
  });
}
