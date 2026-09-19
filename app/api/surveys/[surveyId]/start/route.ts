import { NextResponse } from 'next/server';
import { requireAuthorizedProfile } from '@/lib/survey-authorization';
import { loadEligibleSurvey } from '@/lib/server-survey-submission';
import { RequestError } from '@/lib/security/request';
export async function POST(_request: Request, context: { params: Promise<{surveyId: string}> }) {
  const authorized = await requireAuthorizedProfile('community');
  if (authorized.response) return authorized.response;
  try {
    const id = Number((await context.params).surveyId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new RequestError('Invalid survey.');
    const { admin } = await loadEligibleSurvey(authorized.profile.id, id);
    const { error } = await admin.from('survey_attempts').upsert({ member_id: authorized.profile.id, survey_id: id }, { onConflict: 'member_id,survey_id', ignoreDuplicates: true });
    if (error) throw new RequestError('Could not start survey.', 503);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestError ? error.message : 'Could not start survey.' }, { status: error instanceof RequestError ? error.status : 503 });
  }
}
