export type PersistedSurveyOrder = {
  id: string;
  requires_review?: boolean;
  draft_payload?: unknown;
  refund_status?: string | null;
  user_id: string;
  checkout_id: string | null;
  currency: string;
  total_cents: number;
  question_count: number;
  response_count: number;
  include_detailed_report: boolean;
  pricing_version: string;
  pricing: Record<string, unknown>;
};
export type CheckoutEvidence = {
  id: string; status: string; amount: number; currency: string;
  discount_amount?: number;
  discount_id?: string | null;
  net_amount?: number;
  external_customer_id: string | null; metadata: Record<string, string>;
};
export function assertOrderPayment(order: PersistedSurveyOrder, checkout: CheckoutEvidence, userId: string) {
  if (order.user_id !== userId || checkout.external_customer_id !== userId || order.checkout_id !== checkout.id)
    throw new Error("This checkout belongs to another customer or order.");
  if (checkout.currency.toUpperCase() !== order.currency || checkout.amount !== order.total_cents)
    throw new Error("Payment amount or currency does not match the stored order.");
  if (order.pricing_version !== "legacy-polar-v0" && checkout.metadata.order_id !== order.id)
    throw new Error("Payment does not match the stored order reference.");
  // Evidence is fetched from Polar server-side. Keep the original price check above;
  // only Polar-applied discounts may reduce what the customer pays.
  if (order.pricing_version !== "legacy-polar-v0") {
    const discount = checkout.discount_amount ?? 0;
    if (!Number.isSafeInteger(discount) || discount < 0 || discount > order.total_cents ||
        (discount > 0 && (typeof checkout.discount_id !== "string" || !checkout.discount_id.trim() ||
          checkout.net_amount !== order.total_cents - discount)) ||
        (checkout.net_amount !== undefined && checkout.net_amount !== order.total_cents - discount))
      throw new Error("Invalid Polar discount or discounted payment amount.");
  }
  if (order.refund_status) throw new Error("This payment is under refund review.");
  // Do not recalculate historical prices with the current pricing formula.
  return checkout.status === "succeeded";
}
export function assertOrderSurvey(order: PersistedSurveyOrder, payload: {
  questionCount: number; targetResponses: number; includeDetailedAI: boolean; questions: unknown[];
}) {
  if (order.requires_review) throw new Error("Legacy payment preserved at its original price. Contact support to reconcile it with any previously published survey before publication.");
  if (payload.questionCount !== order.question_count || payload.targetResponses !== order.response_count ||
      payload.includeDetailedAI !== order.include_detailed_report || payload.questions.length < 5 ||
      payload.questions.length > order.question_count)
    throw new Error("Survey does not match the purchased question allowance, responses, or report.");
}
