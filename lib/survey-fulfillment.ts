import { verifySurveyOrder } from '@/lib/survey-orders';
import { assertOrderSurvey } from '@/lib/survey-order-verification';
import { parseCreateSurveyPayload } from '@/lib/survey-checkout-validation';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildSurveyInsertPayload, mapSurveyRowToClientSurvey, type SurveyRow } from '@/lib/survey-db';
import { getUnsupportedCommunityLaunchCountries } from '@/lib/community-distribution';
import { RequestError } from '@/lib/security/request';

/** Idempotent for browser returns, webhook retries and manual recovery alike. */
export async function fulfillSurveyOrder(checkoutId: string, userId: string) {
  const { order, isPaid } = await verifySurveyOrder(checkoutId, userId);
  if (!isPaid) throw new RequestError('Payment has not succeeded.', 409);
  const admin = createAdminClient();
  const existing = await admin.from('surveys').select('*').eq('pricing_order_id', order.id).eq('user_id', userId).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return mapSurveyRowToClientSurvey(existing.data as SurveyRow);
  const { payload } = parseCreateSurveyPayload(order.draft_payload);
  if (!payload) throw new RequestError('Payment recorded. Contact support to recover this older survey draft.', 409);
  assertOrderSurvey(order, payload);
  if (getUnsupportedCommunityLaunchCountries(payload.audience.countries).length) throw new RequestError('Unsupported audience country.');
  const inserted = await admin.from('surveys').insert({ ...buildSurveyInsertPayload(payload, userId), pricing_order_id: order.id }).select('*').single();
  if (inserted.error?.code === '23505') {
    const retry = await admin.from('surveys').select('*').eq('pricing_order_id', order.id).eq('user_id', userId).single();
    if (retry.error) throw retry.error;
    return mapSurveyRowToClientSurvey(retry.data as SurveyRow);
  }
  if (inserted.error) throw inserted.error;
  return mapSurveyRowToClientSurvey(inserted.data as SurveyRow);
}
