import { NextResponse } from "next/server";
import { createPolarCheckout } from "@/lib/polar";
import { AI_DETAILED_SURVEY_FEE, getAcademicSurveyBasePrice } from "@/lib/survey-pricing";
import { getCurrentUserProfile } from "@/lib/supabase/profile-server";

type CheckoutRequestBody = {
  surveyTitle?: string;
  questionCount?: number;
  respondentCount?: 50 | 100 | 250 | 500 | 1000;
  includeDetailedAI?: boolean;
};

export async function POST(request: Request) {
  try {
    const authenticated = await getCurrentUserProfile();

    if (!authenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (authenticated.profile.role !== "client") {
      return NextResponse.json({ success: false, error: "Only client accounts can create survey checkouts." }, { status: 403 });
    }

    const body = (await request.json()) as CheckoutRequestBody;

    if (
      typeof body.surveyTitle !== "string" ||
      typeof body.questionCount !== "number" ||
      !body.respondentCount
    ) {
      return NextResponse.json({ success: false, error: "Invalid checkout payload." }, { status: 400 });
    }

    const { questionTier, basePrice } = getAcademicSurveyBasePrice(body.questionCount, body.respondentCount);
    const aiFee = body.includeDetailedAI ? AI_DETAILED_SURVEY_FEE : 0;
    const totalInCents = (basePrice + aiFee) * 100;
    const displayName =
      [authenticated.profile.firstName, authenticated.profile.lastName].filter(Boolean).join(" ") ||
      authenticated.profile.email;

    const checkout = await createPolarCheckout({
      amountInCents: totalInCents,
      customerEmail: authenticated.profile.email,
      customerName: displayName,
      externalCustomerId: authenticated.profile.id,
      origin: new URL(request.url).origin,
      metadata: {
        survey_title: body.surveyTitle.trim(),
        question_tier: String(questionTier),
        question_count: String(body.questionCount),
        respondent_count: String(body.respondentCount),
        include_detailed_ai: String(Boolean(body.includeDetailedAI))
      }
    });

    return NextResponse.json({
      success: true,
      checkoutId: checkout.id,
      checkoutUrl: checkout.url
    });
  } catch (error) {
    console.error("Polar checkout creation failed.", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create Polar checkout."
      },
      { status: 500 }
    );
  }
}
