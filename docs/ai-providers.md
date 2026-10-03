# AI provider routing

Survey creation (`POST /api/survey-assistant`) uses only Perplexity's current Agent API (`/v1/agent`) with the `low` research preset, web search and URL fetching. Research is bounded to three tool calls/steps and 8192 output tokens, with a 90-second timeout and 120-second function duration. Structured JSON is independently validated for question count, types, text and options before returning to the editor. Authorization and per-user AI budgets remain required. Missing credentials or failed/invalid research return a recoverable error; survey creation never silently switches to Gemini.

Response evaluation and trust scoring (`lib/server-trust-evaluation.ts`) use only Gemini. A stable rubric assesses relevance, completeness, consistency and timing; opinions, demographics and sufficient short answers must not be penalized. Credits are calculated by existing server rules, never accepted from model or browser. Validated stored questions, submitted answers, and server-measured elapsed time feed actual submissions. Provider failures retain the existing bounded local fallback, explicitly marked `fallback`; it is not a Gemini assessment. Response reports also remain on Gemini. Respondent answers are never sent to Perplexity.

## Environment variables

Set these server-only variables in Vercel Project Settings → Environment Variables:

- `PERPLEXITY_API_KEY`: generate in the Perplexity console. Empty until the owner supplies it.
- `GEMINI_API_KEY`: replace the existing value with the refreshed Gemini key.
- `GEMINI_MODEL`: defaults to `gemini-2.5-flash`; used by evaluation, reports and readiness checks.

Apply keys to intended Production/Preview/Development environments and redeploy after changes. Do not prefix keys with `NEXT_PUBLIC_` or commit them. `.env.local.example` contains the local configuration template. Owner readiness checks show missing Perplexity configuration; a configured key remains unverified until actual survey creation confirms provider access and billing. No live research call is made by readiness checks.

## Verification

Run `npm test`, `npx tsc --noEmit`, and `npm run build`. Provider routing tests verify Perplexity-only creation, Gemini-only evaluation, malformed/incomplete provider output rejection, missing-key behavior, and server-calculated credits. After adding keys, create a survey with a real authenticated client, then submit a response as an eligible community member and confirm the stored evaluation source is `gemini`.
