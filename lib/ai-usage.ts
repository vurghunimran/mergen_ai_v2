import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2_147_483_647 ? value : null;
}
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function extractAiUsage(provider: "Perplexity" | "Google Gemini", payload: unknown) {
  const body = object(payload);
  const usage = object(provider === "Perplexity" ? body.usage : body.usageMetadata);
  const cost = object(usage.cost);
  return {
    input_tokens: count(provider === "Perplexity" ? usage.input_tokens : usage.promptTokenCount),
    output_tokens: count(provider === "Perplexity" ? usage.output_tokens : usage.candidatesTokenCount),
    total_tokens: count(provider === "Perplexity" ? usage.total_tokens : usage.totalTokenCount),
    cost_usd: provider === "Perplexity" && cost.currency === "USD" && typeof cost.total_cost === "number" && Number.isFinite(cost.total_cost) && cost.total_cost >= 0 && cost.total_cost < 1e10 ? cost.total_cost : null
  };
}
// Metadata only: never persist provider headers, prompts, survey answers or response text.
// Telemetry failure must not interrupt an otherwise successful survey or evaluation.
export async function trackedAiFetch(provider: "Perplexity" | "Google Gemini", model: string, scope: "questions" | "report" | "evaluation", url: string, init: RequestInit) {
  let result: Response | undefined;
  let payload: unknown;
  try {
    result = await fetch(url, init);
    try { payload = await result.clone().json(); } catch { /* A provider may return a non-JSON error. */ }
    return result;
  } finally {
    try {
      const body = object(payload);
      const { error } = await createAdminClient().from("ai_usage_events").insert({
        provider, model: typeof body.model === "string" ? body.model.slice(0, 120) : model,
        scope, outcome: !result ? "network_error" : !result.ok || body.error || (provider === "Perplexity" && body.status !== "completed") ? "provider_error" : "ok",
        ...extractAiUsage(provider, payload)
      });
      if (error) console.error("AI usage recording failed.", error.code);
    } catch { console.error("AI usage recording unavailable."); }
  }
}
