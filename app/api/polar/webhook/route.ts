import { NextResponse } from 'next/server';
import { Webhook } from 'standardwebhooks';
import { readBodyText, RequestError } from '@/lib/security/request';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPolarCheckout } from '@/lib/polar';
import { verifySurveyOrder } from '@/lib/survey-orders';
import { fulfillSurveyOrder } from '@/lib/survey-fulfillment';
export async function POST(request: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook unavailable.' }, { status: 503 });
  let event: { type?: string; data?: { id?: string; checkout_id?: string; status?: string } };
  try {
    const raw = await readBodyText(request, 256_000);
    // Polar signs with the UTF-8 endpoint secret (same encoding as its official SDK).
    event = new Webhook(Buffer.from(secret, 'utf8').toString('base64')).verify(raw, Object.fromEntries(request.headers)) as typeof event;
    if (!event || typeof event.type !== 'string' || !event.data) throw new Error();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid webhook.' }, { status: error instanceof RequestError ? error.status : 401 });
  }
  if (!['checkout.updated','order.paid','order.refunded'].includes(event.type!)) return NextResponse.json({ received: true });
  if (event.type === 'checkout.updated' && event.data?.status !== 'succeeded') return NextResponse.json({ received: true });
  const checkoutId = event.type === 'checkout.updated' ? event.data?.id : event.data?.checkout_id;
  if (typeof checkoutId !== 'string') return NextResponse.json({ error: 'Missing checkout.' }, { status: 400 });
  try {
    const admin = createAdminClient();
    const id = request.headers.get('webhook-id')!;
    const seen = await admin.from('payment_webhook_events').select('id').eq('id', id).maybeSingle();
    if (seen.error) throw seen.error;
    if (seen.data) return NextResponse.json({ received: true });
    let stored = await admin.from('survey_orders').select('user_id,refund_status').eq('checkout_id', checkoutId).maybeSingle();
    if (stored.error) throw stored.error;
    // Link persistence may race a fast provider webhook. Retry instead of dropping it.
    if (!stored.data) {
      const checkout = await getPolarCheckout(checkoutId);
      if (checkout.external_customer_id && checkout.metadata.order_id) {
        await verifySurveyOrder(checkoutId, checkout.external_customer_id);
        stored = await admin.from('survey_orders').select('user_id,refund_status').eq('checkout_id', checkoutId).maybeSingle();
      }
    }
    if (!stored.data) return NextResponse.json({ error: 'Order not linked yet.' }, { status: 503 });
    if (event.type === 'order.refunded') {
      const refunded = await admin.rpc('record_survey_refund', { p_checkout: checkoutId });
      if (refunded.error) throw refunded.error;
    } else if (!stored.data.refund_status) {
      await fulfillSurveyOrder(checkoutId, stored.data.user_id);
    }
    const saved = await admin.from('payment_webhook_events').upsert({ id, event_type: event.type }, { onConflict: 'id', ignoreDuplicates: true });
    if (saved.error) throw saved.error;
    return NextResponse.json({ received: true });
  } catch {
    // Provider retries failures. Never acknowledge before durable work succeeds.
    return NextResponse.json({ error: 'Payment reconciliation needs retry.' }, { status: 503 });
  }
}
