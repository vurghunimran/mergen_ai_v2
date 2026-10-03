import { NextResponse } from "next/server";
import { requireAuthorizedProfile } from "@/lib/survey-authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJsonObject, RequestError } from "@/lib/security/request";
import { communityRewardCountries } from "@/lib/community-reward-countries";
import { cashWithdrawalsEnabled, trolleyCountryEnabled, withdrawalAmount, findTrolleyRecipient, CASH_WITHDRAWAL_CREDITS, CASH_WITHDRAWAL_CENTS } from "@/lib/trolley";
import { processCashWithdrawal, publicWithdrawal, type CashWithdrawal } from "@/lib/cash-withdrawals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;
const unavailable = () => NextResponse.json({ error: "Cash withdrawals are not available yet." }, { status: 503 });
function countryCode(country: string) {
  return communityRewardCountries.find(x => x.name === country)?.code ?? "";
}
export async function GET() {
  const auth = await requireAuthorizedProfile("community");
  if (auth.response) return auth.response;
  const enabled = cashWithdrawalsEnabled() && trolleyCountryEnabled(countryCode(auth.profile.country));
  try {
    const { data, error } = await createAdminClient().from("cash_withdrawals").select("*")
      .eq("member_id", auth.profile.id).order("created_at", { ascending: false }).limit(100);
    if (error) {
      if (!enabled && ["42P01", "PGRST205"].includes(error.code)) return NextResponse.json({ enabled: false, withdrawals: [], minimumCredits: CASH_WITHDRAWAL_CREDITS, amountCents: CASH_WITHDRAWAL_CENTS });
      throw error;
    }
    return NextResponse.json({ enabled, minimumCredits: CASH_WITHDRAWAL_CREDITS, amountCents: CASH_WITHDRAWAL_CENTS,
      withdrawals: (data as CashWithdrawal[]).map(publicWithdrawal) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Could not load cash withdrawals." }, { status: 503 }); }
}
export async function POST(request: Request) {
  const auth = await requireAuthorizedProfile("community");
  if (auth.response) return auth.response;
  if (!cashWithdrawalsEnabled() || !trolleyCountryEnabled(countryCode(auth.profile.country))) return unavailable();
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const body = await readJsonObject(request, 4096);
    if (typeof body.idempotencyKey !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.idempotencyKey)) {
      return NextResponse.json({ error: "Invalid withdrawal request." }, { status: 400 });
    }
    try { withdrawalAmount(body.credits); } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }
    const admin = createAdminClient();
    // Replays return the persisted request even if the recipient's details have since changed.
    const prior = await admin.from("cash_withdrawals").select("*").eq("member_id", auth.profile.id).eq("request_key", body.idempotencyKey).maybeSingle();
    if (prior.error) throw prior.error;
    if (prior.data) {
      if (prior.data.credits !== body.credits) return NextResponse.json({ error: "Request key is already used for a different amount." }, { status: 409 });
      if (prior.data.status === "queued") await processCashWithdrawal(prior.data, true);
      const current = await admin.from("cash_withdrawals").select("*").eq("id", prior.data.id).single();
      if (current.error) throw current.error;
      return NextResponse.json({ withdrawal: publicWithdrawal(current.data), message: "Your existing withdrawal request has been restored." });
    }
    const recipient = await findTrolleyRecipient(auth.profile.id, "live");
    if (!recipient || recipient.status !== "active" || recipient.payoutMethod !== "bank-transfer" ||
        recipient.email.toLowerCase() !== auth.profile.email.toLowerCase() ||
        recipient.address?.country !== countryCode(auth.profile.country)) {
      return NextResponse.json({ error: "Complete your bank details and required verification before withdrawing." }, { status: 409 });
    }
    if (recipient.primaryCurrency === "USD" && Number(recipient.routeMinimum) > withdrawalAmount(body.credits) / 100) {
      return NextResponse.json({ error: "This bank route does not support a $10 withdrawal. Choose another bank route." }, { status: 409 });
    }
    const { data, error } = await admin.rpc("reserve_cash_withdrawal", { p_member: auth.profile.id,
      p_request: body.idempotencyKey, p_credits: body.credits, p_recipient: recipient.id });
    if (error) return NextResponse.json({ error: ["23514", "23505"].includes(error.code) ? "Insufficient credits or conflicting withdrawal request." : "Could not reserve withdrawal." }, { status: ["23514", "23505"].includes(error.code) ? 409 : 503 });
    await processCashWithdrawal(data as CashWithdrawal, true);
    const current = await admin.from("cash_withdrawals").select("*").eq("id", data.id).single();
    if (current.error) throw current.error;
    return NextResponse.json({ withdrawal: publicWithdrawal(current.data), message: current.data.status === "review"
      ? "Your withdrawal is reserved and awaiting review. Please do not submit another request for the same payout."
      : "Your withdrawal is reserved. Track its status below." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestError ? error.message : "Could not complete the withdrawal request. Retry the same request to check its status." }, { status: error instanceof RequestError ? error.status : 503 });
  }
}
