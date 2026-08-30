import { NextResponse } from "next/server";
import { buildCommunityAudienceProfile, matchesSurveyAudience } from "@/lib/audience-matching";
import { parseStoredSurveyQuestions, parseSurveyAudience, parseSurveySubmissionAnswers, type SurveyRow } from "@/lib/survey-db";
import { buildAudienceForDistributionStage, hasSurveyExpired, normalizeSurveyDistributionStage } from "@/lib/survey-rollout";
import { buildFallbackTrustEvaluation } from "@/lib/trust-score";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTelegramSurveySession } from "@/lib/telegram-mini-app";

export const dynamic = "force-dynamic";

function headers(request: Request) {
  return request.headers.get("x-telegram-init-data") || "";
}

async function getContext(request: Request, token: string) {
  const admin = createAdminClient();
  const resolved = await resolveTelegramSurveySession(admin, token, headers(request));
  if ("error" in resolved) return { response: NextResponse.json({ error: resolved.error }, { status: resolved.status }) };

  const [{ data: survey }, { data: profile }] = await Promise.all([
    admin.from("surveys").select("*").eq("id", resolved.session.survey_id).eq("status", "published").maybeSingle(),
    admin.from("community_profiles").select("country,age_span,gender,educational_level,interests,salary_range,place_of_residence,family_status").eq("id", resolved.session.user_id).maybeSingle()
  ]);
  if (!survey || !profile) return { response: NextResponse.json({ error: "This survey is no longer available." }, { status: 404 }) };

  const surveyRow = survey as SurveyRow;
  const audience = buildAudienceForDistributionStage(parseSurveyAudience(surveyRow.audience), Math.max(1, normalizeSurveyDistributionStage(surveyRow.distribution_stage)) as 1 | 2 | 3 | 4);
  const member = buildCommunityAudienceProfile({
    ageSpan: profile.age_span, country: profile.country, gender: profile.gender,
    education: profile.educational_level, interests: profile.interests,
    salaryRange: profile.salary_range, residence: profile.place_of_residence,
    familyStatus: profile.family_status
  });
  if (surveyRow.days_remaining <= 0 || hasSurveyExpired(surveyRow.distribution_expires_at) || !matchesSurveyAudience(audience, member)) {
    return { response: NextResponse.json({ error: "This survey is no longer active for your profile." }, { status: 409 }) };
  }
  return { admin, session: resolved.session, survey: surveyRow, questions: parseStoredSurveyQuestions(surveyRow.questions) };
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const context = await getContext(request, token);
  if ("response" in context) return context.response;

  const { data: existing } = await context.admin.from("survey_responses").select("id").eq("survey_id", context.survey.id).eq("respondent_id", context.session.user_id).maybeSingle();
  if (existing) return NextResponse.json({ error: "You have already submitted this survey." }, { status: 409 });

  return NextResponse.json({
    survey: { id: context.survey.id, name: context.survey.name, description: context.survey.description },
    questions: context.questions,
    answers: context.session.answers || {},
    startedAt: context.session.started_at
  });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null) as { token?: string; answers?: unknown } | null;
  const token = body?.token || "";
  const context = await getContext(request, token);
  if ("response" in context) return context.response;
  const answers = body?.answers && typeof body.answers === "object" && !Array.isArray(body.answers) ? body.answers : {};
  const now = new Date().toISOString();
  const { error } = await context.admin.from("telegram_survey_sessions").update({ answers, started_at: context.session.started_at || now }).eq("token_hash", context.session.token_hash);
  return error ? NextResponse.json({ error: "Could not save progress." }, { status: 500 }) : NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { token?: string; answers?: unknown; completionTimeSeconds?: number } | null;
  const token = body?.token || "";
  const context = await getContext(request, token);
  if ("response" in context) return context.response;
  const parsedAnswers = parseSurveySubmissionAnswers(body?.answers);
  const completionTimeSeconds = Math.max(1, Math.round(body?.completionTimeSeconds || 0));
  if (parsedAnswers.length !== context.questions.length || parsedAnswers.some((answer) => Array.isArray(answer.answer) ? answer.answer.length === 0 : !answer.answer.trim())) {
    return NextResponse.json({ error: "Please answer every question before submitting." }, { status: 400 });
  }

  const evaluation = buildFallbackTrustEvaluation({
    surveyTitle: context.survey.name,
    surveyDescription: context.survey.description,
    questions: context.questions,
    answers: parsedAnswers,
    completionTimeSeconds
  });
  const { data, error } = await context.admin.from("survey_responses").insert({
    survey_id: context.survey.id, respondent_id: context.session.user_id,
    completion_time_seconds: completionTimeSeconds, trust_score: evaluation.trustScore,
    earned_credits: evaluation.credits, summary: evaluation.summary, answers: parsedAnswers
  }).select("id,submitted_at").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "You have already submitted this survey." : "Could not submit your response." }, { status: error.code === "23505" ? 409 : 500 });

  await context.admin.from("telegram_survey_sessions").update({ status: "completed", answers: {}, completed_at: new Date().toISOString() }).eq("token_hash", context.session.token_hash);
  return NextResponse.json({ success: true, responseId: data.id, submittedAt: data.submitted_at, earnedCredits: evaluation.credits, summary: evaluation.summary });
}
