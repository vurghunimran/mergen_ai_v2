import { NextResponse } from "next/server";
import { listCommunityCompletions, listPublishedSurveysForRespondent } from "@/lib/survey-db";
import { requireAuthorizedProfile } from "@/lib/survey-authorization";
import { getSurveyStorageErrorMessage } from "@/lib/survey-storage-errors";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authorized = await requireAuthorizedProfile("community");

  if (authorized.response) {
    return authorized.response;
  }

  try {
    const supabase = createClient();
    const [surveys, completions] = await Promise.all([
      listPublishedSurveysForRespondent(supabase, authorized.profile.id),
      listCommunityCompletions(supabase, authorized.profile.id)
    ]);

    return NextResponse.json({ surveys, completions });
  } catch (error) {
    console.error("Failed to load published surveys.", error);
    return NextResponse.json({ error: getSurveyStorageErrorMessage(error) ?? "Could not load surveys." }, { status: 500 });
  }
}
