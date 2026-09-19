import { NextResponse } from 'next/server';
import { requireAuthorizedProfile } from '@/lib/survey-authorization';
import { createClient } from '@/lib/supabase/server';
export async function GET() {
  const authorized = await requireAuthorizedProfile('client');
  if (authorized.response) return authorized.response;
  const client = await createClient();
  const orders = await client.from('survey_orders').select('id,checkout_id,created_at').eq('user_id', authorized.profile.id)
    .not('checkout_id','is',null).is('refund_status',null).order('created_at',{ascending:false}).limit(20);
  if (orders.error) return NextResponse.json({ error: 'Could not load payments.' }, { status: 503 });
  const published = await client.from('surveys').select('pricing_order_id').eq('user_id',authorized.profile.id).in('pricing_order_id',(orders.data ?? []).map(o=>o.id));
  if (published.error) return NextResponse.json({ error: 'Could not load payments.' }, { status: 503 });
  const ids = new Set((published.data ?? []).map(s=>s.pricing_order_id));
  return NextResponse.json({ orders: (orders.data ?? []).filter(o=>!ids.has(o.id)) });
}
