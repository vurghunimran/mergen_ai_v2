import "server-only";
import { requireAdminProfile } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/pagination";
import { memberCountries, normalizePeriod, type AiUsageRow, type ExpenseRow, type OrderRecord, type OrderRow } from "@/lib/admin-metrics";

export async function getAdminAnalytics(requestedPeriod?: string) {
  await requireAdminProfile();
  const admin = createAdminClient();
  const results = await Promise.all([
    fetchAllRows(() => admin.from("survey_orders").select("id,user_id,checkout_id,currency,total_cents,question_count,response_count,include_detailed_report,status,refund_status,requires_review,provider_environment,created_at").order("created_at", { ascending: false }).order("id")),
    fetchAllRows(() => admin.from("profiles").select("id,role,email,first_name,last_name,created_at").order("id")),
    fetchAllRows(() => admin.from("community_profiles").select("id,country").order("id")),
    fetchAllRows(() => admin.from("surveys").select("id,name,pricing_order_id").order("id")),
    fetchAllRows(() => admin.from("operating_expenses").select("id,provider,kind,amount_cents,currency,paid_on,description,reference,created_at,voided_at").order("paid_on", { ascending: false }).order("id")),
    fetchAllRows(() => admin.from("ai_usage_events").select("id,provider,model,scope,outcome,input_tokens,output_tokens,total_tokens,cost_usd,created_at").order("created_at", { ascending: false }).order("id"))
  ]);
  const labels = ["Orders", "Accounts", "Countries", "Survey fulfillment", "Expenses", "AI usage"];
  const unavailable = results.flatMap((result, index) => result.error ? [labels[index]] : []);
  for (let i = 0; i < results.length; i++) if (results[i].error) console.error(`Admin ${labels[i]} read failed.`, (results[i].error as { code?: string }).code ?? "unknown");
  const period = normalizePeriod(requestedPeriod);
  const profiles = results[1].data ?? [];
  const profilesById = new Map(profiles.map(row => [row.id, row]));
  const surveysByOrder = new Map((results[3].data ?? []).filter(row => row.pricing_order_id).map(row => [row.pricing_order_id, row]));
  const orders: OrderRecord[] = ((results[0].data ?? []) as OrderRow[]).map(row => {
    const profile = profilesById.get(row.user_id);
    const survey = surveysByOrder.get(row.id);
    return { ...row, customer: profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email : "Account unavailable",
      survey: survey?.name ?? "Survey not published", surveyId: survey?.id ?? null,
      state: row.refund_status ? "refunded" : row.status !== "paid" ? "pending" : row.requires_review ? "review" : results[3].error ? "unknown" : survey ? "fulfilled" : "paid" };
  });
  return { period, unavailable, orders, expenses: (results[4].data ?? []) as ExpenseRow[], aiUsage: (results[5].data ?? []) as AiUsageRow[],
    community: memberCountries(profiles, results[2].data ?? [], period), updatedAt: new Date().toISOString() };
}
export type AdminAnalytics = Awaited<ReturnType<typeof getAdminAnalytics>>;
