import { NextResponse } from "next/server";
import { listPublishedSurveys } from "@/lib/survey-db";
import { requireAuthorizedProfile } from "@/lib/survey-authorization";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authorized = await requireAuthorizedProfile("community");

  if (authorized.response) {
    return authorized.response;
  }

  try {
    const supabase = createClient();
    const surveys = await listPublishedSurveys(supabase);
    return NextResponse.json({ surveys });
  } catch (error) {
    console.error("Failed to load published surveys.", error);
    return NextResponse.json({ error: "Could not load surveys." }, { status: 500 });
  }
}
