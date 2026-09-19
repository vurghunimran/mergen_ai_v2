import { NextResponse } from "next/server";
import { requireAuthorizedProfile } from "@/lib/survey-authorization";
// Scoring is internal to submission, so callers cannot shop for or supply an award.
export async function POST() {
  const authorized = await requireAuthorizedProfile("community");
  if (authorized.response) return authorized.response;
  return NextResponse.json({ error: "Submit the survey to receive its verified evaluation." }, { status: 410 });
}
