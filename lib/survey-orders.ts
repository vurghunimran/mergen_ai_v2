import { getPolarCheckout } from "@/lib/polar";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertOrderPayment, type PersistedSurveyOrder } from "@/lib/survey-order-verification";

export async function verifySurveyOrder(checkoutId: string, userId: string) {
  const checkout = await getPolarCheckout(checkoutId);
  if (checkout.external_customer_id !== userId) throw new Error("This checkout belongs to another customer.");
  const admin = createAdminClient();
  const { data, error } = await admin.from("survey_orders").select("*").eq("checkout_id", checkoutId).maybeSingle();
  if (error) throw error;
  let order = data as PersistedSurveyOrder | null;
  if (!order) {
    // Previously paid provider orders are imported at their original amount, never repriced.
    if (checkout.metadata.pricing_version || checkout.status !== "succeeded")
      throw new Error("Stored survey order not found.");
    const questionCount = Number(checkout.metadata.question_count);
    const responseCount = Number(checkout.metadata.respondent_count);
    const report = checkout.metadata.include_detailed_ai;
    if (!Number.isInteger(questionCount) || questionCount < 5 || questionCount > 25 ||
        ![50,100,250,500,1000].includes(responseCount) || !["true", "false"].includes(report) ||
        !Number.isInteger(checkout.amount) || checkout.amount <= 0 || checkout.currency.toLowerCase() !== "usd")
      throw new Error("Legacy payment needs manual review; its original amount has been preserved.");
    const { error: insertError } = await admin.from("survey_orders").upsert({
      user_id: userId, checkout_id: checkout.id, currency: "USD", total_cents: checkout.amount,
      question_count: questionCount, response_count: responseCount, include_detailed_report: report === "true",
      pricing_version: "legacy-polar-v0", pricing: { ...checkout.metadata, totalCents: checkout.amount, currency: "USD", pricingVersion: "legacy-polar-v0" },
      status: "paid", requires_review: true
    }, { onConflict: "checkout_id", ignoreDuplicates: true });
    if (insertError) throw insertError;
    const result = await admin.from("survey_orders").select("*").eq("checkout_id", checkoutId).single();
    if (result.error) throw result.error;
    order = result.data as PersistedSurveyOrder;
  }
  const isPaid = assertOrderPayment(order, checkout, userId);
  if (isPaid) {
    const { error: updateError } = await admin.from("survey_orders").update({ status: "paid" }).eq("id", order.id);
    if (updateError) throw updateError;
  }
  return { order, checkout, isPaid };
}
