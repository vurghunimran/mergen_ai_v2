import { trolleyConfigured, trolleyRequest, cashWithdrawalsEnabled, trolleyMode } from "@/lib/trolley";
import { isTremendousConfigured, tremendousGet, tremendousMode } from "@/lib/tremendous";
import vercelConfiguration from "../vercel.json";

export type IntegrationCheck = {
  service: string;
  status: "verified" | "blocked" | "unverified";
  detail: string;
  missing: string[];
};

function missing(names: string[]) {
  return names.filter(name => !process.env[name]?.trim());
}
function check(service: string, status: IntegrationCheck["status"], detail: string, absent: string[] = []): IntegrationCheck {
  return { service, status, detail, missing: absent };
}
async function read(url: string, headers: Record<string, string>) {
  const response = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}
async function safe(service: string, task: () => Promise<IntegrationCheck>) {
  try { return await task(); }
  catch { return check(service, "unverified", "The provider check failed or timed out. Check the credentials and provider dashboard."); }
}

// Owner-only callers. These checks read provider state without creating checkouts,
// payments, reward orders, messages, or changes to external accounts.
export async function getProductionReadiness(): Promise<IntegrationCheck[]> {
  const base = process.env.APP_BASE_URL?.replace(/\/+$/, "");
  return Promise.all([
    safe("Polar", async () => {
      const absent = missing(["POLAR_ACCESS_TOKEN", "POLAR_SURVEY_PRODUCT_ID"]);
      if (!process.env.POLAR_WEBHOOK_SECRET && !process.env.POLAR_WEBHOOK) absent.push("POLAR_WEBHOOK_SECRET");
      if (absent.length) return check("Polar", "blocked", "Production payment configuration is incomplete.", absent);
      if (process.env.POLAR_SERVER === "sandbox") return check("Polar", "blocked", "Polar is in sandbox mode.");
      if (!base?.startsWith("https://")) return check("Polar", "blocked", "Configure the HTTPS production APP_BASE_URL.", ["APP_BASE_URL"]);
      const headers = { Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}` };
      const [product, webhooks] = await Promise.all([
        read(`https://api.polar.sh/v1/products/${encodeURIComponent(process.env.POLAR_SURVEY_PRODUCT_ID!)}`, headers),
        read("https://api.polar.sh/v1/webhooks/endpoints/?limit=100", headers)
      ]);
      if (product.status === 403 || webhooks.status === 403) return check("Polar", "unverified", "The token lacks product or webhook read permissions. Checkout and settlement access still need verification.");
      if (!product.ok || !webhooks.ok) return check("Polar", "blocked", "Production product or webhook access failed. Check token permissions and product ID.");
      if (product.data?.is_archived !== false || product.data?.is_recurring !== false) return check("Polar", "blocked", "Survey payments require an active one-time production product.");
      const endpoints = webhooks.data?.items?.filter((item: { url?: string }) => item.url === `${base}/api/polar/webhook`) ?? [];
      if (!endpoints.length) return check("Polar", "blocked", `Register the production webhook at ${base}/api/polar/webhook.`);
      const endpoint = endpoints.find((item: { enabled?: boolean }) => item.enabled);
      if (!endpoint) return check("Polar", "blocked", "The production webhook is disabled in Polar. Review failed deliveries before enabling it.");
      if (endpoint.format && endpoint.format !== "raw") return check("Polar", "blocked", "The production webhook must use Raw JSON delivery format.");
      const absentEvents = ["checkout.updated", "order.paid", "order.refunded"].filter(event => !endpoint.events?.includes(event));
      if (absentEvents.length) return check("Polar", "blocked", `The production webhook is missing events: ${absentEvents.join(", ")}.`);
      if (endpoint.secret !== (process.env.POLAR_WEBHOOK_SECRET || process.env.POLAR_WEBHOOK)) return check("Polar", "blocked", "The production webhook signing secret differs from Mergen's deployed secret. Update both sides to match.");
      return check("Polar", "verified", "Active one-time production product and matching payment/refund webhook verified. A real checkout and refund still need end-to-end validation.");
    }),
    safe("Trolley", async () => {
      const absent = missing(["TROLLEY_LIVE_ACCESS_KEY", "TROLLEY_LIVE_SECRET_KEY", "TROLLEY_LIVE_WEBHOOK_SECRET", "TROLLEY_ALLOWED_COUNTRIES"]);
      if (absent.length || !trolleyConfigured("live")) return check("Trolley", "blocked", "Live cash withdrawals need credentials, webhook setup, funded account, and reviewed countries.", absent);
      const result = await trolleyRequest<{ balances: Array<{ type: string; currency: string; amount: string }> }>("GET", "/v1/balances", undefined, "live");
      const funded = result.balances?.some(balance => balance.type === "paymentrails" && Number(balance.amount) > 0);
      if (!funded) return check("Trolley", "blocked", "Live credentials work, but no positive Trolley bank-payout funding balance was found.");
      if (trolleyMode() !== "live" || !cashWithdrawalsEnabled()) return check("Trolley", "blocked", "Live account access and a positive funding balance verified. Member withdrawals are disabled; verify bank routes and a real payout before opening them.");
      return check("Trolley", "verified", "Live account access and a positive funding balance verified; withdrawals are enabled for configured countries. Funding adequacy, webhook delivery and bank receipt need operational confirmation.");
    }),
    safe("Tremendous", async () => {
      if (tremendousMode() !== "production") return check("Tremendous", "blocked", "The catalog is using sandbox mode. Gift redemption remains disabled.");
      if (!isTremendousConfigured("production")) return check("Tremendous", "blocked", "Add an approved production PROD_ key to load the real catalog. Gift redemption remains disabled.", ["TREMENDOUS_API_KEY"]);
      const result = await tremendousGet<{ funding_sources: Array<{ method: string; status: string; usage_permissions: string[]; meta?: { available_amount?: number; currency_code?: string } }> }>("/funding_sources", "production");
      const funded = result.funding_sources?.some(source => source.method === "balance" && source.status === "active" && source.usage_permissions?.includes("api_orders") && Number(source.meta?.available_amount) > 0);
      return check("Tremendous", "verified", funded
        ? "Production account access and funded API balance verified. Gifts stay disabled pending your product and pricing choices and fulfillment implementation."
        : "Production account access verified; no active funded API balance was found. Gifts stay disabled pending funding, your product/pricing choices and fulfillment implementation.");
    }),
    safe("Supabase", async () => {
      const absent = missing(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
      if (absent.length) return check("Supabase", "blocked", "Production database credentials are incomplete.", absent);
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const result = await read(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`, { apikey: key, Authorization: `Bearer ${key}` });
      return check("Supabase", result.ok ? "verified" : "blocked", result.ok ? "Server database access verified. No member data is exposed by this check." : "Server database access failed.");
    }),
    safe("Resend", async () => {
      const absent = missing(["RESEND_API_KEY", "RESEND_FROM_EMAIL"]);
      if (absent.length) return check("Resend", "blocked", "Production email configuration is incomplete.", absent);
      const result = await read("https://api.resend.com/domains", { Authorization: `Bearer ${process.env.RESEND_API_KEY}` });
      if (result.status === 403) return check("Resend", "unverified", "The sending key cannot inspect domains. Verify the sender domain in Resend.");
      const domain = process.env.RESEND_FROM_EMAIL?.match(/@([^>\s]+)/)?.[1]?.toLowerCase();
      const verified = result.ok && domain && result.data?.data?.some((item: { name: string; status: string }) => item.name === domain && item.status === "verified");
      return check("Resend", verified ? "verified" : "blocked", verified ? "Production sender domain verified. This check sends no email and does not verify inbox delivery." : "Sender domain verification or account access failed.");
    }),
    Promise.resolve(missing(["PERPLEXITY_API_KEY"]).length
      ? check("Perplexity", "blocked", "Survey research and creation credentials are missing.", ["PERPLEXITY_API_KEY"])
      : check("Perplexity", "unverified", "Survey creation key is configured. Verify a real survey generation to confirm access, billing, and quota.")),
    safe("Gemini", async () => {
      const absent = missing(["GEMINI_API_KEY"]);
      if (absent.length) return check("Gemini", "blocked", "Response evaluation credentials are missing.", absent);
      const result = await read(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash")}`, { "x-goog-api-key": process.env.GEMINI_API_KEY! });
      const verified = result.ok && result.data?.supportedGenerationMethods?.includes("generateContent");
      return check("Gemini", verified ? "verified" : "blocked", verified ? "Configured model access verified. Generation quota and billing require a separate operational check." : "Configured model access failed.");
    }),
    safe("Telegram", async () => {
      const absent = missing(["TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET", "TELEGRAM_BOT_USERNAME"]);
      if (absent.length) return check("Telegram", "blocked", "Production bot configuration is incomplete.", absent);
      const result = await read(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`, {});
      const verified = result.ok && result.data?.ok && base && result.data.result?.url === `${base}/api/telegram/webhook`;
      return check("Telegram", verified ? "verified" : "blocked", verified ? "Production webhook URL verified. Secret validation and opt-in message delivery still require operational validation." : "Bot access failed or its webhook is not registered to the production URL.");
    }),
    Promise.resolve(check("Survey scheduler", missing(["CRON_SECRET"]).length ? "blocked" : "verified",
      missing(["CRON_SECRET"]).length
        ? "The hourly survey scheduler requires a production CRON_SECRET."
        : `Hourly Vercel cron configured (${vercelConfiguration.crons[0].schedule}) with secret authorization. Check execution health in Vercel runtime logs.`,
      missing(["CRON_SECRET"])))
  ]);
}
