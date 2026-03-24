import { NextResponse } from "next/server";
import { buildForbiddenSurveyResponse, requireAuthorizedProfile } from "@/lib/survey-authorization";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    surveyId: string;
  };
};

type SurveyResponseRequestBody = {
  completionTimeSeconds?: number;
  trustScore?: number;
  earnedCredits?: number;
  summary?: string;
  answers?: unknown[];
};

function parseSurveyId(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseResponseBody(body: SurveyResponseRequestBody | null) {
  if (!body || !Array.isArray(body.answers)) {
    return null;
  }

  const completionTimeSeconds =
    typeof body.completionTimeSeconds === "number" && body.completionTimeSeconds > 0 ? Math.round(body.completionTimeSeconds) : 0;
  const trustScore = typeof body.trustScore === "number" ? Math.max(0, Math.min(100, Math.round(body.trustScore))) : -1;
  const earnedCredits = typeof body.earnedCredits === "number" && body.earnedCredits >= 0 ? Math.round(body.earnedCredits) : -1;
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";

  if (completionTimeSeconds <= 0 || trustScore < 0 || earnedCredits < 0 || !summary) {
    return null;
  }

  return {
    completionTimeSeconds,
    trustScore,
    earnedCredits,
    summary,
    answers: body.answers
  };
}

export async function POST(request: Request, context: RouteContext) {
  const authorized = await requireAuthorizedProfile("community");

  if (authorized.response) {
    return authorized.response;
  }

  const surveyId = parseSurveyId(context.params.surveyId);

  if (!surveyId) {
    return NextResponse.json({ error: "Invalid survey id." }, { status: 400 });
  }

  const payload = parseResponseBody((await request.json().catch(() => null)) as SurveyResponseRequestBody | null);

  if (!payload) {
    return NextResponse.json({ error: "Invalid survey response payload." }, { status: 400 });
  }

  try {
    const supabase = createClient();
    const { data: survey } = await supabase
      .from("surveys")
      .select("id")
      .eq("id", surveyId)
      .eq("status", "published")
      .maybeSingle();

    if (!survey) {
      return buildForbiddenSurveyResponse();
    }

    const { data, error } = await supabase
      .from("survey_responses")
      .insert({
        survey_id: surveyId,
        respondent_id: authorized.profile.id,
        completion_time_seconds: payload.completionTimeSeconds,
        trust_score: payload.trustScore,
        earned_credits: payload.earnedCredits,
        summary: payload.summary,
        answers: payload.answers
      })
      .select("id,submitted_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "You have already submitted this survey." }, { status: 409 });
      }

      throw error;
    }

    return NextResponse.json({
      success: true,
      responseId: data.id,
      submittedAt: data.submitted_at
    });
  } catch (error) {
    console.error("Failed to submit survey response.", error);
    return NextResponse.json({ error: "Could not submit survey response." }, { status: 500 });
  }
}
