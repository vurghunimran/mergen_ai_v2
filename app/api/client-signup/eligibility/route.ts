import { NextResponse } from "next/server";
import { checkClientSignupEligibility, type ClientSignupEligibilityRequest } from "@/lib/client-signup-eligibility";
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as ClientSignupEligibilityRequest | null;
  if (!body || typeof body !== "object") return NextResponse.json({ allowed: false, message: "Could not read the client sign-up details." }, { status: 400 });
  return checkClientSignupEligibility(body);
}
