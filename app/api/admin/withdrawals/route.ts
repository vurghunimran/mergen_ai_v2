import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase/profile-server";
import { isAdminIdentity } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJsonObject, RequestError } from "@/lib/security/request";
import { cashWithdrawalsEnabled, trolleyConfigured, trolleyMode } from "@/lib/trolley";
import { processCashWithdrawal, recoverCashWithdrawal, syncCashWithdrawal, cancelUnprocessedCashWithdrawal } from "@/lib/cash-withdrawals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
async function authorize() {
  const auth = await getCurrentUserProfile();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminIdentity(auth.user)) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  return null;
}
export async function GET() {
  const denied = await authorize(); if (denied) return denied;
  const { data, error } = await createAdminClient().from("cash_withdrawals").select("*").order("created_at", { ascending: false }).limit(100);
  return NextResponse.json({ mode: trolleyMode(), configured: trolleyConfigured(), enabled: cashWithdrawalsEnabled(),
    withdrawals: error ? [] : data, storageReady: !error }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  const denied = await authorize(); if (denied) return denied;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const body = await readJsonObject(request, 4096);
    if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id) || !["sync", "process", "cancel"].includes(String(body.action))) {
      return NextResponse.json({ error: "Invalid withdrawal action." }, { status: 400 });
    }
    if (!trolleyConfigured("live") || (body.action === "process" && !cashWithdrawalsEnabled())) {
      return NextResponse.json({ error: "Live payouts are not configured or enabled." }, { status: 503 });
    }
    const { data, error } = await createAdminClient().from("cash_withdrawals").select("*").eq("id", body.id).single();
    if (error) return NextResponse.json({ error: "Withdrawal not found." }, { status: 404 });
    if (body.action === "process" && !["queued", "submitting", "review"].includes(data.status)) {
      return NextResponse.json({ error: "This payout is already processing or finished. Sync its status instead." }, { status: 409 });
    }
    if (body.action === "cancel") await cancelUnprocessedCashWithdrawal(data);
    else if (body.action === "process") await processCashWithdrawal(data);
    else await syncCashWithdrawal(await recoverCashWithdrawal(data));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Withdrawal could not be reconciled. Check its provider batch before retrying." }, { status: error instanceof RequestError ? error.status : 503 });
  }
}
