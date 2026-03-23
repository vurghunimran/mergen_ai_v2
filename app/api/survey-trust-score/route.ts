import { NextResponse } from "next/server";
import type { SurveyTrustEvaluationRequest, SurveyTrustEvaluationResponse } from "@/lib/dashboard-data";
import { buildFallbackTrustEvaluation, calculateCreditsFromTrustScore } from "@/lib/trust-score";

type GeminiTrustPayload = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    message?: string;
  };
};

type GeminiTrustResult = {
  trustScore: number;
  summary: string;
  strengths: string[];
  risks: string[];
};

const geminiModel = "gemini-2.5-flash";

function buildTrustSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["trustScore", "summary", "strengths", "risks"],
    properties: {
      trustScore: {
        type: "integer",
        minimum: 0,
        maximum: 100
      },
      summary: {
        type: "string"
      },
      strengths: {
        type: "array",
        items: {
          type: "string"
        },
        maxItems: 3
      },
      risks: {
        type: "array",
        items: {
          type: "string"
        },
        maxItems: 3
      }
    }
  };
}

function buildSystemPrompt() {
  return [
    "You are MERGEN AI, a strict but fair survey response quality evaluator.",
    "Review whether a respondent answered a survey thoughtfully and consistently.",
    "Use the completion time, question content, answer relevance, depth, and internal consistency.",
    "Do not judge the respondent for their opinions, only the response quality.",
    "High trust scores mean the answers are relevant, coherent, and realistically paced.",
    "Low trust scores mean the answers are rushed, generic, contradictory, or off-topic.",
    "Keep strengths and risks short and concrete."
  ].join(" ");
}

function buildUserPrompt(payload: SurveyTrustEvaluationRequest) {
  return JSON.stringify(
    {
      survey_title: payload.surveyTitle,
      survey_description: payload.surveyDescription,
      completion_time_seconds: payload.completionTimeSeconds,
      questions_and_answers: payload.answers.map((answer) => ({
        question: answer.questionText,
        question_type: answer.questionType,
        answer: Array.isArray(answer.answer) ? answer.answer : answer.answer.trim()
      }))
    },
    null,
    2
  );
}

function extractGeminiText(payload: GeminiTrustPayload) {
  return payload.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text?.trim())
    .find((text): text is string => Boolean(text));
}

export async function POST(request: Request) {
  const requestBody = (await request.json().catch(() => null)) as Partial<SurveyTrustEvaluationRequest> | null;

  if (!requestBody) {
    return NextResponse.json({ error: "Failed to evaluate survey response." }, { status: 400 });
  }

  const payload: SurveyTrustEvaluationRequest = {
    surveyTitle: (requestBody.surveyTitle ?? "").trim(),
    surveyDescription: (requestBody.surveyDescription ?? "").trim(),
    questions: Array.isArray(requestBody.questions) ? requestBody.questions : [],
    answers: Array.isArray(requestBody.answers) ? requestBody.answers : [],
    completionTimeSeconds: Math.max(1, Math.round(Number(requestBody.completionTimeSeconds ?? 0)))
  };

  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!payload.surveyTitle || payload.questions.length === 0 || payload.answers.length === 0) {
      return NextResponse.json({ error: "Incomplete survey evaluation payload." }, { status: 400 });
    }

    if (!geminiApiKey) {
      return NextResponse.json(buildFallbackTrustEvaluation(payload));
    }

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
            parts: [
              {
                text: buildSystemPrompt()
              }
            ]
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: buildUserPrompt(payload)
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseJsonSchema: buildTrustSchema()
          }
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(30000)
      }
    );

    const geminiPayload = (await geminiResponse.json()) as GeminiTrustPayload;

    if (!geminiResponse.ok) {
      return NextResponse.json(buildFallbackTrustEvaluation(payload));
    }

    const responseText = extractGeminiText(geminiPayload);

    if (!responseText) {
      if (geminiPayload.promptFeedback?.blockReason) {
        return NextResponse.json(buildFallbackTrustEvaluation(payload));
      }

      return NextResponse.json(buildFallbackTrustEvaluation(payload));
    }

    const parsed = JSON.parse(responseText) as GeminiTrustResult;
    const trustScore = Math.min(100, Math.max(0, Math.round(Number(parsed.trustScore ?? 0))));

    const normalizedResponse: SurveyTrustEvaluationResponse = {
      trustScore,
      credits: calculateCreditsFromTrustScore(trustScore),
      summary: parsed.summary?.trim() || "AI reviewed the response quality and timing.",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter(Boolean).slice(0, 3) : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.filter(Boolean).slice(0, 3) : [],
      completionTimeSeconds: payload.completionTimeSeconds,
      source: "gemini"
    };

    return NextResponse.json(normalizedResponse);
  } catch {
    return NextResponse.json(buildFallbackTrustEvaluation(payload));
  }
}
