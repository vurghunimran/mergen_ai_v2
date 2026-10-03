import { NextResponse } from "next/server";
import { readBodyText, RequestError } from "@/lib/security/request";
import { verifyTrolleyWebhook } from "@/lib/trolley";
import { createAdminClient } from "@/lib/supabase/admin";
import { recoverCashWithdrawal, syncCashWithdrawal, type CashWithdrawal } from "@/lib/cash-withdrawals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!process.env.TROLLEY_LIVE_WEBHOOK_SECRET) return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  try {
    const raw = await readBodyText(request, 128_000);
    if (!verifyTrolleyWebhook(raw, request.headers.get("x-paymentrails-signature"), process.env.TROLLEY_LIVE_WEBHOOK_SECRET)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }
    const event = JSON.parse(raw);
    // Trolley sends a signed empty object to validate a webhook subscription.
    if (Object.keys(event).length === 0) return NextResponse.json({ received: true });
    if (event.model !== "payment") return NextResponse.json({ received: true });
    const payment = event.body?.payment;
    if (!payment || typeof payment.externalId !== "string" || !/^[0-9a-f-]{36}$/i.test(payment.externalId)) return NextResponse.json({ received: true });
    const { data, error } = await createAdminClient().from("cash_withdrawals").select("*").eq("id", payment.externalId).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ received: true });
    // Re-fetch current state: signed events can still arrive late or out of order.
    const row = await recoverCashWithdrawal(data as CashWithdrawal);
    await syncCashWithdrawal(row);
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: "Could not reconcile webhook." }, { status: error instanceof RequestError ? error.status : 503 });
  }
}
