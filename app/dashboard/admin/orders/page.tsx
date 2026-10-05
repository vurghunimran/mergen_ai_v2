import { getAdminAnalytics } from "@/lib/admin-analytics";
import { inPeriod, summarizeOrders } from "@/lib/admin-metrics";
import { DashboardCard, DataNotice, MoneyTotals, PeriodFilter } from "@/components/admin/BusinessDashboardParts";
import OrdersTable from "@/components/admin/OrdersTable";

export const dynamic = "force-dynamic";
export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const data = await getAdminAnalytics((await searchParams).period);
  const totals = summarizeOrders(data.orders, data.period);
  const unavailable = data.unavailable.filter(label => ["Orders", "Accounts", "Survey fulfillment"].includes(label));
  return <div className="space-y-6"><PeriodFilter period={data.period} title="Survey orders" /><DataNotice unavailable={unavailable} />
    {!unavailable.includes("Orders") ? <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><DashboardCard label="Orders" value={totals.total} caption={`All checkout attempts. ${totals.sandbox} sandbox · ${totals.unknown} unclassified.`} /><DashboardCard label="Live paid orders" value={totals.livePaid} caption={`${totals.paid} paid records across all environments · ${totals.pending} unpaid · ${totals.refunded} refunded.`} /><DashboardCard label="Gross live order value" value={<MoneyTotals totals={totals.gross} />} caption="Live paid orders, before refunds, tax and provider fees." /><DashboardCard label="Live value after refunds" value={<MoneyTotals totals={totals.retained} />} caption="Excludes refunds, sandbox and unclassified orders. Not a settlement or profit figure." /></div><OrdersTable orders={data.orders.filter(row => inPeriod(row.created_at, data.period))} /></> : null}
  </div>;
}
