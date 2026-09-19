import { NextResponse } from "next/server";
import { requireAuthorizedProfile } from "@/lib/survey-authorization";
import { listClientSurveysForUser } from "@/lib/survey-db";
import { createClient } from "@/lib/supabase/server";
import { getSurveyStorageErrorMessage } from "@/lib/survey-storage-errors";
import { fulfillSurveyOrder } from "@/lib/survey-fulfillment";
import { readJsonObject, RequestError } from "@/lib/security/request";
export const dynamic = "force-dynamic";
export async function GET() {
  const authorized = await requireAuthorizedProfile("client");

  if (authorized.response) {
    return authorized.response;
  }

  try {
    const supabase = await createClient();
    const surveys = await listClientSurveysForUser(supabase, authorized.profile.id);
    return NextResponse.json({ surveys });
  } catch (error) {
    console.error("Failed to load client surveys.", error);
    return NextResponse.json({ error: getSurveyStorageErrorMessage(error) ?? "Could not load surveys." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorized = await requireAuthorizedProfile("client");
  if (authorized.response) return authorized.response;
  try {
    const body = await readJsonObject(request, 4_000_000);
    if (typeof body.checkoutId !== "string" || !body.checkoutId || body.checkoutId.length > 128) throw new RequestError("A verified checkout is required.");
    const survey = await fulfillSurveyOrder(body.checkoutId, authorized.profile.id);
    return NextResponse.json({ survey });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestError ? error.message : "Could not publish survey. Your payment remains recorded; retry or contact support." }, { status: error instanceof RequestError ? error.status : 503 });
  }
}
