import { createAdminClient } from '@/lib/supabase/admin';
import { buildCommunityAudienceProfile, matchesSurveyAudience } from '@/lib/audience-matching';
import { buildAudienceForDistributionStage, normalizeSurveyDistributionStage, hasSurveyExpired } from '@/lib/survey-rollout';
import { parseSurveyAudience } from '@/lib/survey-db';
import { RequestError } from '@/lib/security/request';

export async function loadEligibleSurvey(memberId: string, surveyId: number) {
  const admin = createAdminClient();
  const [{ data: survey, error }, { data: member, error: memberError }] = await Promise.all([
    admin.from('surveys').select('*').eq('id', surveyId).maybeSingle(),
    admin.from('community_profiles').select('*').eq('id', memberId).maybeSingle()
  ]);
  if (error || memberError) throw new RequestError('Could not load survey.', 503);
  if (!survey || !member) throw new RequestError('Survey unavailable.', 403);
  if (survey.status !== 'published' || survey.days_remaining <= 0 || hasSurveyExpired(survey.distribution_expires_at)) throw new RequestError('This survey is no longer active.', 409);
  const profile = buildCommunityAudienceProfile({ ageSpan: member.age_span, country: member.country, gender: member.gender,
    education: member.educational_level, interests: member.interests, salaryRange: member.salary_range,
    residence: member.place_of_residence, familyStatus: member.family_status });
  const audience = buildAudienceForDistributionStage(parseSurveyAudience(survey.audience), Math.max(1, normalizeSurveyDistributionStage(survey.distribution_stage)) as 1 | 2 | 3 | 4);
  if (!matchesSurveyAudience(audience, profile)) throw new RequestError('Survey unavailable for this audience.', 403);
  return { admin, survey, member };
}
