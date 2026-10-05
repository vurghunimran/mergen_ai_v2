import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase/profile-server";
import { isAdminIdentity } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJsonObject, RequestError } from "@/lib/security/request";
import { isUuid, parseExpense } from "@/lib/admin-expenses";

export const dynamic = "force-dynamic";
async function mutate(request: Request, voidEntry = false) {
  const auth = await getCurrentUserProfile();
  if (!auth) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (!isAdminIdentity(auth.user)) return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const body = await readJsonObject(request, 4000);
    const admin = createAdminClient();
    if (voidEntry) {
      if (!isUuid(body.id)) throw new RequestError("Invalid expense ID.");
      const result = await admin.from("operating_expenses").update({ voided_at: new Date().toISOString(), voided_by: auth.profile.id }).eq("id", body.id).is("voided_at", null).select("id").maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) throw new RequestError("Entry not found or already voided.", 404);
    } else {
      const entry = parseExpense(body);
      const result = await admin.from("operating_expenses").insert({ ...entry, created_by: auth.profile.id });
      if (result.error?.code === "23505") {
        const existing = await admin.from("operating_expenses").select("*").eq("id", entry.id).single();
        if (existing.error) throw existing.error;
        if (existing.data.voided_at || Object.entries(entry).some(([key, value]) => existing.data[key] !== value)) throw new RequestError("This entry ID was already used. Refresh before adding a new entry.", 409);
      } else if (result.error) throw result.error;
    }
    return NextResponse.json({ saved: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Admin expense write failed.", (error as { code?: string })?.code ?? "unknown");
    return NextResponse.json({ error: "Could not save the expense. Your entry has been kept; please retry." }, { status: 503 });
  }
}
export async function POST(request: Request) { return mutate(request); }
export async function DELETE(request: Request) { return mutate(request, true); }
