import { getAdminAnalytics } from "@/lib/admin-analytics";
import { bakuDate, inPeriod, summarizeExpenses } from "@/lib/admin-metrics";
import { DashboardCard, DataNotice, ExpenseProviderTable, MoneyTotals, PeriodFilter } from "@/components/admin/BusinessDashboardParts";
import ExpenseLedger from "@/components/admin/ExpenseLedger";

export const dynamic = "force-dynamic";
export default async function AdminExpensesPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const data = await getAdminAnalytics((await searchParams).period);
  const totals = summarizeExpenses(data.expenses, data.period);
  const unavailable = data.unavailable.filter(label => label === "Expenses");
  return <div className="space-y-6"><PeriodFilter period={data.period} title="Operating expenses" /><DataNotice unavailable={unavailable} />
    <p className="text-sm leading-6 text-slate-600">Record actual payments for AI, hosting, email, payouts and other services. Provider invoices are not imported automatically. Separate currencies and prepaid top-ups keep the totals clear.</p>
    {!unavailable.length ? <><div className="grid gap-4 sm:grid-cols-2"><DashboardCard label="Recorded expenses" value={<MoneyTotals totals={totals.expenses} />} caption="Active expense entries paid in this period." /><DashboardCard label="Prepaid balance top-ups" value={<MoneyTotals totals={totals.topUps} />} caption="Funding payments, kept separate from operating expenses and tracked AI usage." /></div><section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold text-slate-900">Provider breakdown</h3><ExpenseProviderTable providers={totals.providers} /></section><ExpenseLedger rows={data.expenses.filter(row => inPeriod(row.paid_on, data.period))} today={bakuDate()} /></> : null}
  </div>;
}
