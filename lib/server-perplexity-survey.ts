import { RequestError } from "@/lib/security/request";
import { trackedAiFetch } from "@/lib/ai-usage";

type AgentResponse = {
  status?: string;
  error?: unknown;
  output?: Array<{
    type?: string;
    role?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

// Only survey directions are sent here. Respondent answers belong to Gemini.
export async function generatePerplexitySurvey(
  apiKey: string, instructions: string, input: string, schema: object
): Promise<string> {
  const response = await trackedAiFetch("Perplexity", "preset:low", "questions", "https://api.perplexity.ai/v1/agent", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      preset: "low",
      instructions,
      input,
      tools: [{ type: "web_search" }, { type: "fetch_url" }],
      max_steps: 3,
      max_tool_calls: 3,
      max_output_tokens: 8192,
      response_format: { type: "json_schema", json_schema: { name: "survey", schema } }
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(90_000)
  });
  if (!response.ok) throw new RequestError("Survey research service is temporarily unavailable. Please try again.", 502);
  const payload = await response.json() as AgentResponse;
  if (payload.status !== "completed" || payload.error) {
    throw new RequestError("Survey research did not complete. Please try again.", 502);
  }
  // REST responses contain output items; output_text is an SDK convenience field.
  const text = payload.output?.filter(item => item.type === "message" && item.role === "assistant")
    .flatMap(item => item.content ?? [])
    .filter(part => part.type === "output_text" && typeof part.text === "string")
    .map(part => part.text).join("").trim();
  if (!text) throw new RequestError("Survey research returned no usable content. Please try again.", 502);
  return text;
}
