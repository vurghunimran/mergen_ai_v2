import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase/profile-server";
import { isAdminIdentity } from "@/lib/admin-access";
import { getProductionReadiness } from "@/lib/production-readiness";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const authenticated = await getCurrentUserProfile();
  if (!authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminIdentity(authenticated.user)) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  return NextResponse.json({ checkedAt: new Date().toISOString(), checks: await getProductionReadiness() }, {
    headers: { "Cache-Control": "no-store" }
  });
}
