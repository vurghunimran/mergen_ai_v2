import { NextResponse } from 'next/server';
import { requireAuthorizedProfile } from '@/lib/survey-authorization';
import { createAdminClient } from '@/lib/supabase/admin';
import { evaluateWelcomeSurvey, isWelcomeSurveyId, WELCOME_SURVEY_QUESTIONS } from '@/lib/welcome-survey';
import { validateAnswers, validateDuration } from '@/lib/security/answers';
import { readJsonObject, RequestError } from '@/lib/security/request';
import { loadEligibleSurvey } from '@/lib/server-survey-submission';
import { evaluateSurveyResponse } from '@/lib/server-trust-evaluation';
import { withAiBudget } from '@/lib/security/ai-budget';
import type { StoredSurveyQuestion } from '@/lib/dashboard-data';
export const dynamic = 'force-dynamic';

function result(row: Record<string, unknown>) {
  return NextResponse.json({ success: true, responseId: row.id, submittedAt: row.submitted_at,
    earnedCredits: row.earned_credits, score: row.trust_score ?? null, summary: row.summary,
    source: row.evaluation_source ?? 'fixed', completionTimeSeconds: row.completion_time_seconds });
}
export async function POST(request: Request, context: {params: Promise<{surveyId: string}>}) {
  const authorized = await requireAuthorizedProfile('community');
  if (authorized.response) return authorized.response;
  try {
    const surveyId = Number((await context.params).surveyId);
    if (!Number.isSafeInteger(surveyId) || surveyId <= 0) throw new RequestError('Invalid survey id.');
    const body = await readJsonObject(request);
    const admin = createAdminClient();
    if (isWelcomeSurveyId(surveyId)) {
      const answers = validateAnswers(WELCOME_SURVEY_QUESTIONS, body.answers);
      const seconds = validateDuration(body.completionTimeSeconds);
      const evaluation = evaluateWelcomeSurvey(answers);
      const { data, error } = await admin.from('welcome_survey_completions').upsert({ respondent_id: authorized.profile.id,
        completion_time_seconds: seconds, earned_credits: evaluation.earnedCredits, summary: evaluation.summary, answers
      }, { onConflict: 'respondent_id', ignoreDuplicates: true }).select('*').maybeSingle();
      if (error) throw error;
      if (data) return result(data);
      const previous = await admin.from('welcome_survey_completions').select('*').eq('respondent_id', authorized.profile.id).single();
      if (previous.error) throw previous.error;
      return result(previous.data);
    }
    // Retry returns the original award; neither a client score nor a repeat AI call can change it.
    const previous = await admin.from('survey_responses').select('*').eq('survey_id', surveyId).eq('respondent_id', authorized.profile.id).maybeSingle();
    if (previous.error) throw previous.error;
    if (previous.data) return result(previous.data);
    const { survey, member } = await loadEligibleSurvey(authorized.profile.id, surveyId);
    const answers = validateAnswers(survey.questions as StoredSurveyQuestion[], body.answers);
    const attempt = await admin.from('survey_attempts').select('started_at').eq('survey_id', surveyId).eq('member_id', authorized.profile.id).maybeSingle();
    if (attempt.error) throw attempt.error;
    if (!attempt.data) throw new RequestError('Start the survey before submitting.', 409);
    const seconds = Math.max(1, Math.min(86400, Math.round((Date.now() - Date.parse(attempt.data.started_at)) / 1000)));
    const payload = { surveyTitle: survey.name, surveyDescription: survey.description, questions: survey.questions as StoredSurveyQuestion[], answers, completionTimeSeconds: seconds };
    const evaluation = await withAiBudget(authorized.profile.id, 'evaluation', () => evaluateSurveyResponse(payload));
    const { data, error } = await admin.rpc('submit_verified_response', { p_member: authorized.profile.id, p_survey: surveyId,
      p_survey_version: survey.updated_at, p_member_version: member.updated_at, p_seconds: seconds,
      p_score: evaluation.trustScore, p_credits: evaluation.credits, p_summary: evaluation.summary, p_answers: answers, p_source: evaluation.source });
    if (error) {
      if (['23505','23514','40001'].includes(error.code)) throw new RequestError('Survey closed, changed, or already submitted. Refresh and try again.', 409);
      throw error;
    }
    return result(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestError ? error.message : 'Could not submit survey response.' }, { status: error instanceof RequestError ? error.status : 503 });
  }
}
