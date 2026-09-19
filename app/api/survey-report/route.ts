import { withAiBudget } from "@/lib/security/ai-budget";
import { readJsonObject, RequestError, stringList } from "@/lib/security/request";
import { getSurveyReportAccessError } from "@/lib/survey-report-access";
import { NextResponse } from "next/server";
import type { SurveyReportRequest, SurveyReportResponse } from "@/lib/dashboard-data";
import { getClientSurveyForUser } from "@/lib/survey-db";
import { buildForbiddenSurveyResponse, requireAuthorizedProfile } from "@/lib/survey-authorization";
import { buildFallbackSurveyReport, buildSurveyReportContext } from "@/lib/survey-report";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type GeminiReportPayload = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const geminiModel = "gemini-2.5-flash";

function buildReportSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["executiveSummary", "keyInsights", "futurePredictions", "recommendations", "methodologyNote", "dataQualityNote"],
    properties: {
      executiveSummary: { type: "string" },
      keyInsights: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 5
      },
      futurePredictions: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 4
      },
      recommendations: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 4
      },
      methodologyNote: { type: "string" },
      dataQualityNote: { type: "string" }
    }
  };
}

function buildSystemPrompt() {
  return [
    "You are MERGEN AI, an academic research reporting assistant.",
    "Write a concise but high-value report based on the survey context and collected raw response patterns.",
    "Use the research description, scope, hypothesis, trust score distribution, question charts, and open-response samples.",
    "Do not invent numeric findings that are not supported by the provided data.",
    "Focus on actionable insights, directional trends, and a realistic forward-looking prediction."
  ].join(" ");
}

function extractGeminiText(payload: GeminiReportPayload) {
  return payload.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text?.trim())
    .find((text): text is string => Boolean(text));
}

export async function POST(request: Request) {
  let requestBody: SurveyReportRequest | null;
  try { requestBody = await readJsonObject(request, 4000) as SurveyReportRequest; }
  catch (error) { return NextResponse.json({ error: "Invalid report request." }, { status: error instanceof RequestError ? error.status : 400 }); }

  if (!requestBody?.surveyId || !Number.isInteger(requestBody.surveyId) || requestBody.surveyId <= 0) {
    return NextResponse.json({ error: "Missing survey id." }, { status: 400 });
  }

  const authorized = await requireAuthorizedProfile("client");

  if (authorized.response) {
    return authorized.response;
  }

  let survey;

  try {
    const supabase = await createClient();
    survey = await getClientSurveyForUser(supabase, requestBody.surveyId, authorized.profile.id);
  } catch (error) {
    console.error("Failed to load survey report source data.", error);
    return NextResponse.json({ error: "Could not load survey report data." }, { status: 500 });
  }

  if (!survey) {
    return buildForbiddenSurveyResponse();
  }

  const accessError = getSurveyReportAccessError(survey);
  if (accessError) {
    return NextResponse.json({ error: accessError.error }, { status: accessError.status });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    return NextResponse.json(buildFallbackSurveyReport(survey));
  }

  try {
    return await withAiBudget(authorized.profile.id, "report", async () => {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": geminiApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: buildSystemPrompt() }]
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: JSON.stringify(buildSurveyReportContext(survey), null, 2)
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseJsonSchema: buildReportSchema()
          }
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(30000)
      }
    );

    const payload = (await geminiResponse.json()) as GeminiReportPayload;

    if (!geminiResponse.ok) {
      return NextResponse.json(buildFallbackSurveyReport(survey));
    }

    const responseText = extractGeminiText(payload);

    if (!responseText) {
      return NextResponse.json(buildFallbackSurveyReport(survey));
    }

    const parsed = JSON.parse(responseText) as SurveyReportResponse;
    if (!parsed || [parsed.executiveSummary, parsed.methodologyNote, parsed.dataQualityNote].some(v => typeof v !== "string" || v.length > 8000) ||
        !stringList(parsed.keyInsights) || !stringList(parsed.futurePredictions, 4) || !stringList(parsed.recommendations, 4)) return NextResponse.json(buildFallbackSurveyReport(survey));

    return NextResponse.json({
      executiveSummary: parsed.executiveSummary?.trim() || buildFallbackSurveyReport(survey).executiveSummary,
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights.filter(Boolean).slice(0, 5) : [],
      futurePredictions: Array.isArray(parsed.futurePredictions) ? parsed.futurePredictions.filter(Boolean).slice(0, 4) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.filter(Boolean).slice(0, 4) : [],
      methodologyNote: parsed.methodologyNote?.trim() || buildFallbackSurveyReport(survey).methodologyNote,
      dataQualityNote: parsed.dataQualityNote?.trim() || buildFallbackSurveyReport(survey).dataQualityNote
    } satisfies SurveyReportResponse);
    });
  } catch (error) {
    if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(buildFallbackSurveyReport(survey));
  }
}
