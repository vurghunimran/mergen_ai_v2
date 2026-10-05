import Link from "next/link";
import type { AdminAnalytics } from "@/lib/admin-analytics";
import { summarizeAi, summarizeExpenses, summarizeOrders } from "@/lib/admin-metrics";
import { DashboardCard, DataNotice, ExpenseProviderTable, MoneyTotals, PeriodFilter } from "./BusinessDashboardParts";
import CountryTable from "./CountryTable";

export default function BusinessOverview({ data }: { data: AdminAnalytics }) {
  const orders = summarizeOrders(data.orders, data.period);
  const expenses = summarizeExpenses(data.expenses, data.period);
  const ai = summarizeAi(data.aiUsage, data.period);
  const ordersReady = !data.unavailable.includes("Orders");
  const accountsReady = !data.unavailable.includes("Accounts");
  const expensesReady = !data.unavailable.includes("Expenses");
  const suffix = `?period=${data.period}`;
  return <div className="space-y-6">
    <PeriodFilter period={data.period} title="Business overview" />
    <DataNotice unavailable={data.unavailable} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardCard label="Survey orders" value={ordersReady ? orders.total : "Unavailable"} caption={ordersReady ? `${orders.livePaid} live paid · ${orders.pending} unpaid. ${orders.sandbox} sandbox · ${orders.unknown} unclassified.` : "Order data could not be loaded."} href={`/dashboard/admin/orders${suffix}`} />
      <DashboardCard label="Community members" value={accountsReady ? data.community.total : "Unavailable"} caption={`${data.community.joined} joined in this period. Country totals are all time.`} href="/dashboard/admin/community" />
      <DashboardCard label="Live paid order value" value={ordersReady ? <MoneyTotals totals={orders.retained} /> : "Unavailable"} caption="Live orders created in this period, excluding refunds. Before tax and fees; unclassified orders are excluded." href={`/dashboard/admin/orders${suffix}`} />
      <DashboardCard label="Recorded expenses" value={expensesReady ? <MoneyTotals totals={expenses.expenses} /> : "Unavailable"} caption="Payments entered in the ledger. Balance top-ups and AI usage are shown separately." href={`/dashboard/admin/expenses${suffix}`} />
    </section>
    {accountsReady && !data.unavailable.includes("Countries") ? <CountryTable countries={data.community.countries} /> : null}
    <section className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold text-slate-900">Expenses by provider</h3><Link className="text-sm font-semibold text-[#4153c4]" href={`/dashboard/admin/expenses${suffix}`}>Manage expenses →</Link></div>
        {expensesReady ? <ExpenseProviderTable providers={expenses.providers} /> : <p className="mt-4 text-sm text-slate-500">Expense ledger unavailable.</p>}
        <p className="mt-3 text-xs leading-5 text-slate-500">Vercel, AI and other invoices are entered manually. Different currencies are never combined.</p>
      </div>
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold text-slate-900">Order fulfillment</h3>
        {ordersReady && !data.unavailable.includes("Survey fulfillment") ? <dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between"><dt className="text-slate-600">Survey published</dt><dd className="font-semibold">{orders.fulfilled}</dd></div><div className="flex justify-between"><dt className="text-slate-600">Paid, awaiting publication or review</dt><dd className="font-semibold">{orders.needsReview}</dd></div><div className="flex justify-between"><dt className="text-slate-600">Unpaid checkout attempts</dt><dd className="font-semibold">{orders.pending}</dd></div><div className="flex justify-between"><dt className="text-slate-600">Refunded orders</dt><dd className="font-semibold">{orders.refunded}</dd></div></dl> : <p className="mt-4 text-sm text-slate-500">Order fulfillment data unavailable.</p>}
        <p className="mt-5 text-xs leading-5 text-slate-500">All environments. Published means a survey is linked to its paid order, not that all requested responses have been collected.</p>
      </div>
    </section>
    <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold text-slate-900">AI activity</h3><p className="mt-2 text-sm text-slate-500">Tracked from this dashboard’s release onward. Reported usage costs are not added to the payment ledger.</p>
      {data.unavailable.includes("AI usage") ? <p className="mt-5 text-sm text-slate-500">AI usage unavailable.</p> : <div className="mt-5 grid gap-4 sm:grid-cols-2">{ai.map(row => <div key={row.provider} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-slate-900">{row.provider}</p><p className="mt-2 text-sm text-slate-600">{row.calls} requests · {row.failures} provider/network errors</p><p className="mt-1 text-sm text-slate-600">{row.tokens.toLocaleString()} reported tokens ({row.callsWithTokens}/{row.calls} requests)</p><p className="mt-2 text-sm font-medium text-slate-900">{row.callsWithCost ? `$${row.costUsd.toFixed(4)} reported usage cost (${row.callsWithCost}/${row.calls} requests)` : "Usage cost not reported; add your invoice to expenses."}</p></div>)}{!ai.length ? <p className="text-sm text-slate-500">No AI requests tracked for this period yet.</p> : null}</div>}
    </section>
    <p className="text-xs text-slate-500">Updated {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Baku" }).format(new Date(data.updatedAt))} Baku. Reload to refresh.</p>
  </div>;
}
