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
  const requestBody = (await request.json().catch(() => null)) as SurveyReportRequest | null;

  if (!requestBody?.surveyId || !Number.isInteger(requestBody.surveyId) || requestBody.surveyId <= 0) {
    return NextResponse.json({ error: "Missing survey id." }, { status: 400 });
  }

  const authorized = await requireAuthorizedProfile("client");

  if (authorized.response) {
    return authorized.response;
  }

  let survey;

  try {
    const supabase = createClient();
    survey = await getClientSurveyForUser(supabase, requestBody.surveyId, authorized.profile.id);
  } catch (error) {
    console.error("Failed to load survey report source data.", error);
    return NextResponse.json({ error: "Could not load survey report data." }, { status: 500 });
  }

  if (!survey) {
    return buildForbiddenSurveyResponse();
  }

  if (!survey.includeDetailedAI) {
    return NextResponse.json({ error: "AI report is only available for surveys that purchased the AI report add-on." }, { status: 403 });
  }

  if (!survey.rawResponses?.length) {
    return NextResponse.json({ error: "No raw responses are available yet for this survey." }, { status: 400 });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    return NextResponse.json(buildFallbackSurveyReport(survey));
  }

  try {
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

    return NextResponse.json({
      executiveSummary: parsed.executiveSummary?.trim() || buildFallbackSurveyReport(survey).executiveSummary,
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights.filter(Boolean).slice(0, 5) : [],
      futurePredictions: Array.isArray(parsed.futurePredictions) ? parsed.futurePredictions.filter(Boolean).slice(0, 4) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.filter(Boolean).slice(0, 4) : [],
      methodologyNote: parsed.methodologyNote?.trim() || buildFallbackSurveyReport(survey).methodologyNote,
      dataQualityNote: parsed.dataQualityNote?.trim() || buildFallbackSurveyReport(survey).dataQualityNote
    } satisfies SurveyReportResponse);
  } catch {
    return NextResponse.json(buildFallbackSurveyReport(survey));
  }
}
