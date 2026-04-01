import { NextResponse } from "next/server";
import {
  buildCommunityAudienceProfile,
  matchesSurveyAudience
} from "@/lib/audience-matching";
import { archiveSurvey } from "@/lib/survey-distribution";
import {
  buildAudienceForDistributionStage,
  hasSurveyExpired,
  normalizeSurveyDistributionStage
} from "@/lib/survey-rollout";
import { buildForbiddenSurveyResponse, requireAuthorizedProfile } from "@/lib/survey-authorization";
import { getSurveyStorageErrorMessage } from "@/lib/survey-storage-errors";
import { parseSurveyAudience, parseSurveySubmissionAnswers, type SurveyRow } from "@/lib/survey-db";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { evaluateWelcomeSurvey, isWelcomeSurveyId, WELCOME_SURVEY_QUESTIONS } from "@/lib/welcome-survey";

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

type WelcomeSurveyResponsePayload = {
  completionTimeSeconds: number;
  answers: ReturnType<typeof parseSurveySubmissionAnswers>;
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

function parseWelcomeSurveyResponseBody(body: SurveyResponseRequestBody | null): WelcomeSurveyResponsePayload | null {
  if (!body || !Array.isArray(body.answers)) {
    return null;
  }

  const completionTimeSeconds =
    typeof body.completionTimeSeconds === "number" && body.completionTimeSeconds > 0
      ? Math.round(body.completionTimeSeconds)
      : 0;
  const answers = parseSurveySubmissionAnswers(body.answers);

  if (completionTimeSeconds <= 0 || answers.length !== WELCOME_SURVEY_QUESTIONS.length) {
    return null;
  }

  return {
    completionTimeSeconds,
    answers
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

  const requestBody = (await request.json().catch(() => null)) as SurveyResponseRequestBody | null;

  if (isWelcomeSurveyId(surveyId)) {
    const welcomePayload = parseWelcomeSurveyResponseBody(requestBody);

    if (!welcomePayload) {
      return NextResponse.json({ error: "Invalid welcome survey response payload." }, { status: 400 });
    }

    try {
      const supabase = createClient();
      const evaluation = evaluateWelcomeSurvey(welcomePayload.answers);
      const { data, error } = await supabase
        .from("welcome_survey_completions")
        .insert({
          respondent_id: authorized.profile.id,
          completion_time_seconds: welcomePayload.completionTimeSeconds,
          earned_credits: evaluation.earnedCredits,
          summary: evaluation.summary,
          answers: welcomePayload.answers
        })
        .select("id,submitted_at,earned_credits,summary")
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
        submittedAt: data.submitted_at,
        earnedCredits: data.earned_credits,
        summary: data.summary,
        score: null,
        source: "fixed"
      });
    } catch (error) {
      console.error("Failed to submit welcome survey response.", error);
      return NextResponse.json(
        {
          error:
            getSurveyStorageErrorMessage(error) ??
            "Could not submit the welcome survey."
        },
        { status: 500 }
      );
    }
  }

  const payload = parseResponseBody(requestBody);

  if (!payload) {
    return NextResponse.json({ error: "Invalid survey response payload." }, { status: 400 });
  }

  try {
    const supabase = createClient();
    const { data: survey } = await supabase
      .from("surveys")
      .select("*")
      .eq("id", surveyId)
      .eq("status", "published")
      .maybeSingle();

    if (!survey) {
      return buildForbiddenSurveyResponse();
    }

    const surveyRow = survey as SurveyRow;

    if (surveyRow.days_remaining <= 0 || hasSurveyExpired(surveyRow.distribution_expires_at)) {
      return NextResponse.json({ error: "This survey is no longer active." }, { status: 409 });
    }

    const memberProfile = buildCommunityAudienceProfile({
      ageSpan: authorized.profile.ageSpan,
      country: authorized.profile.country,
      gender: authorized.profile.gender,
      education: authorized.profile.educationalLevel,
      interests: authorized.profile.interests,
      salaryRange: authorized.profile.salaryRange,
      residence: authorized.profile.placeOfResidence,
      familyStatus: authorized.profile.familyStatus
    });

    const effectiveAudience = buildAudienceForDistributionStage(
      parseSurveyAudience(surveyRow.audience),
      Math.max(1, normalizeSurveyDistributionStage(surveyRow.distribution_stage)) as 1 | 2 | 3 | 4
    );

    if (!matchesSurveyAudience(effectiveAudience, memberProfile)) {
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

    if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
      try {
        const admin = createAdminClient();
        const { count, error: countError } = await admin
          .from("survey_responses")
          .select("id", { count: "exact", head: true })
          .eq("survey_id", surveyId);

        if (countError) {
          throw countError;
        }

        if ((count ?? 0) >= surveyRow.target_responses) {
          await archiveSurvey(admin, surveyId);
        }
      } catch (countSyncError) {
        console.error("Survey closure sync failed after response submission.", countSyncError);
      }
    }

    return NextResponse.json({
      success: true,
      responseId: data.id,
      submittedAt: data.submitted_at
    });
  } catch (error) {
    console.error("Failed to submit survey response.", error);
    return NextResponse.json(
      {
        error: getSurveyStorageErrorMessage(error) ?? "Could not submit survey response."
      },
      { status: 500 }
    );
  }
}
