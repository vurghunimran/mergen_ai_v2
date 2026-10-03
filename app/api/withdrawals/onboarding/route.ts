import { NextResponse } from "next/server";
import { requireAuthorizedProfile } from "@/lib/survey-authorization";
import { cashWithdrawalsEnabled, trolleyCountryEnabled, trolleyWidgetUrl } from "@/lib/trolley";
import { communityRewardCountries } from "@/lib/community-reward-countries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const auth = await requireAuthorizedProfile("community");
  if (auth.response) return auth.response;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const code = communityRewardCountries.find(x => x.name === auth.profile.country)?.code ?? "";
  if (!cashWithdrawalsEnabled() || !trolleyCountryEnabled(code)) {
    return NextResponse.json({ error: "Cash withdrawals are not available for your country yet." }, { status: 503 });
  }
  return NextResponse.json({ url: trolleyWidgetUrl(auth.profile, "live") }, { headers: { "Cache-Control": "no-store" } });
}
