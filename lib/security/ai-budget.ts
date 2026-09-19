import { createAdminClient } from '@/lib/supabase/admin';
import { RequestError } from './request';
export async function withAiBudget<T>(userId: string, scope: 'questions' | 'report' | 'evaluation', run: () => Promise<T>): Promise<T> {
  const admin = createAdminClient();
  const { data: lease, error } = await admin.rpc('acquire_ai_request', { p_user: userId, p_scope: scope });
  if (error || !lease) throw new RequestError(error?.code === 'P0001' ? 'AI usage limit reached. Please try again later.' : 'AI service is temporarily unavailable.', error?.code === 'P0001' ? 429 : 503);
  try { return await run(); }
  finally { await admin.from('ai_request_leases').delete().eq('id', lease); }
}
