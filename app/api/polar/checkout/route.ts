import { NextResponse } from "next/server";
import { createPolarCheckout } from "@/lib/polar";
import { calculateAuthorizedSurveyPricing, SurveyPricingError } from "@/lib/survey-pricing";
import { getClientPricingContext } from "@/lib/client-pricing-category";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const context = await getClientPricingContext();
    if (!context) return NextResponse.json({ success: false, error: "Client authentication required." }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body.surveyTitle !== "string" || !body.surveyTitle.trim())
      throw new SurveyPricingError("Invalid checkout payload.");
    const pricing = calculateAuthorizedSurveyPricing({ pricingCategory: body.pricingCategory,
      questionCount: body.questionCount, responseCount: body.respondentCount,
      includeDetailedReport: body.includeDetailedAI }, context.pricingCategory);
    const admin = createAdminClient();
    const { data: order, error } = await admin.from("survey_orders").insert({
      user_id: context.profile.id, currency: pricing.currency, total_cents: pricing.totalCents,
      question_count: pricing.questionCount, response_count: pricing.responseCount,
      include_detailed_report: pricing.reportFeeCents > 0, pricing_version: pricing.pricingVersion,
      pricing, status: "pending"
    }).select("id").single();
    if (error) throw error;
    const checkout = await createPolarCheckout({ amountInCents: pricing.totalCents,
      customerEmail: context.user.email ?? context.profile.email,
      customerName: [context.profile.firstName, context.profile.lastName].filter(Boolean).join(" ") || context.profile.email,
      externalCustomerId: context.profile.id, origin: new URL(request.url).origin,
      metadata: { order_id: order.id, pricing_version: pricing.pricingVersion,
        pricing_category: pricing.pricingCategory, survey_title: body.surveyTitle.trim(),
        question_count: String(pricing.questionCount), respondent_count: String(pricing.responseCount),
        include_detailed_ai: String(pricing.reportFeeCents > 0) } });
    const { error: linkError } = await admin.from("survey_orders").update({ checkout_id: checkout.id }).eq("id", order.id);
    if (linkError) throw linkError;
    return NextResponse.json({ success: true, checkoutId: checkout.id, checkoutUrl: checkout.url, pricing });
  } catch (error) {
    console.error("Polar checkout creation failed.", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to create Polar checkout." },
      { status: error instanceof SurveyPricingError ? 400 : 500 });
  }
}
