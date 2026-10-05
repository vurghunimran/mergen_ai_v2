export const expenseProviders = ["Perplexity", "Google Gemini", "Vercel", "Supabase", "Resend", "Polar", "Tremendous", "Trolley", "Other"] as const;
export const expenseCurrencies = ["USD", "EUR", "GBP", "AZN"] as const;
export type ExpenseRow = {
  id: string; provider: string; kind: "expense" | "top_up"; amount_cents: number;
  currency: string; paid_on: string; description: string; reference: string;
  created_at: string; voided_at: string | null;
};
export type OrderRow = {
  id: string; user_id: string; checkout_id: string | null; currency: string; total_cents: number;
  question_count: number; response_count: number; include_detailed_report: boolean;
  status: string; refund_status: string | null; requires_review: boolean; created_at: string;
  provider_environment: "production" | "sandbox" | "unknown";
};
export type OrderRecord = OrderRow & { customer: string; survey: string; surveyId: number | null; state: string };
export type AiUsageRow = {
  id: string; provider: string; model: string; scope: string; outcome: string;
  input_tokens: number | null; output_tokens: number | null; total_tokens: number | null;
  cost_usd: number | null; created_at: string;
};
export function bakuDate(value: Date | string = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baku", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
export function normalizePeriod(value: unknown, now = new Date()) {
  if (value === "all") return "all";
  if (typeof value === "string" && /^20\d{2}-(0[1-9]|1[0-2])$/.test(value)) return value;
  return bakuDate(now).slice(0, 7);
}
export function inPeriod(date: string, period: string) {
  return period === "all" || (date.length === 10 ? date : bakuDate(date)).slice(0, 7) === period;
}
export function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}
export function groupMoney<T>(rows: T[], currency: (row: T) => string, amount: (row: T) => number) {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(currency(row), (totals.get(currency(row)) ?? 0) + amount(row));
  return [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([currency, cents]) => ({ currency, cents }));
}
export function summarizeOrders(orders: OrderRecord[], period: string) {
  const selected = orders.filter(row => inPeriod(row.created_at, period));
  const paid = selected.filter(row => row.status === "paid");
  const refunded = paid.filter(row => row.refund_status);
  const livePaid = paid.filter(row => row.provider_environment === "production");
  return {
    total: selected.length, pending: selected.filter(row => row.status !== "paid").length,
    paid: paid.length, refunded: refunded.length,
    livePaid: livePaid.length, sandbox: selected.filter(row => row.provider_environment === "sandbox").length,
    unknown: selected.filter(row => row.provider_environment !== "production" && row.provider_environment !== "sandbox").length,
    fulfilled: selected.filter(row => row.state === "fulfilled").length,
    needsReview: selected.filter(row => row.state === "review" || row.state === "paid").length,
    gross: groupMoney(livePaid, row => row.currency, row => row.total_cents),
    retained: groupMoney(livePaid.filter(row => !row.refund_status), row => row.currency, row => row.total_cents)
  };
}
export function summarizeExpenses(rows: ExpenseRow[], period: string) {
  const selected = rows.filter(row => !row.voided_at && inPeriod(row.paid_on, period));
  return {
    expenses: groupMoney(selected.filter(row => row.kind === "expense"), row => row.currency, row => row.amount_cents),
    topUps: groupMoney(selected.filter(row => row.kind === "top_up"), row => row.currency, row => row.amount_cents),
    providers: [...new Set(selected.map(row => row.provider))].sort().map(provider => ({
      provider,
      expenses: groupMoney(selected.filter(row => row.provider === provider && row.kind === "expense"), row => row.currency, row => row.amount_cents),
      topUps: groupMoney(selected.filter(row => row.provider === provider && row.kind === "top_up"), row => row.currency, row => row.amount_cents)
    }))
  };
}
export function summarizeAi(rows: AiUsageRow[], period: string) {
  const selected = rows.filter(row => inPeriod(row.created_at, period));
  return [...new Set(selected.map(row => row.provider))].sort().map(provider => {
    const calls = selected.filter(row => row.provider === provider);
    return {
      provider, calls: calls.length, failures: calls.filter(row => row.outcome !== "ok").length,
      tokens: calls.reduce((sum, row) => sum + (row.total_tokens ?? 0), 0),
      callsWithTokens: calls.filter(row => row.total_tokens !== null).length,
      costUsd: calls.reduce((sum, row) => sum + (row.cost_usd === null ? 0 : Number(row.cost_usd)), 0),
      callsWithCost: calls.filter(row => row.cost_usd !== null).length
    };
  });
}
export function memberCountries(profiles: Array<{ id: string; role: string; created_at: string }>, details: Array<{ id: string; country: string | null }>, period: string) {
  const community = profiles.filter(row => row.role === "community");
  const byId = new Map(details.map(row => [row.id, row.country?.trim() || "Not set"]));
  const countries = new Map<string, { country: string; count: number; joined: number; percentage: number }>();
  for (const member of community) {
    const country = byId.get(member.id) ?? "Not set";
    const row = countries.get(country) ?? { country, count: 0, joined: 0, percentage: 0 };
    row.count++;
    if (inPeriod(member.created_at, period)) row.joined++;
    countries.set(country, row);
  }
  return { total: community.length, joined: community.filter(row => inPeriod(row.created_at, period)).length,
    countries: [...countries.values()].map(row => ({ ...row, percentage: community.length ? Math.round(row.count / community.length * 100) : 0 }))
      .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country)) };
}
