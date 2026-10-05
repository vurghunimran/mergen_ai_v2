import Link from "next/link";
import { bakuDate, formatMoney } from "@/lib/admin-metrics";

export function PeriodFilter({ period, title }: { period: string; title: string }) {
  const today = bakuDate();
  const current = new Date(`${today.slice(0, 7)}-01T12:00:00Z`);
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(current);
    date.setUTCMonth(date.getUTCMonth() - i);
    return date.toISOString().slice(0, 7);
  });
  if (period !== "all" && !months.includes(period)) months.unshift(period);
  return <div className="flex flex-wrap items-end justify-between gap-4">
    <div><h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">Dates use Baku time.</p></div>
    <form className="flex items-end gap-2" method="get">
      <label className="text-sm font-medium text-slate-600">Period
        <select name="period" defaultValue={period} className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900">
          {months.map(month => <option key={month} value={month}>{new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`))}</option>)}
          <option value="all">All time</option>
        </select>
      </label>
      <button className="rounded-xl bg-[#202a6b] px-4 py-2.5 text-sm font-semibold text-white">Apply</button>
    </form>
  </div>;
}
export function DashboardCard({ label, value, caption, href }: { label: string; value: React.ReactNode; caption: string; href?: string }) {
  return <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
    <p className="mt-3 text-sm leading-6 text-slate-500">{caption}</p>
    {href ? <Link href={href} className="mt-4 inline-block text-sm font-semibold text-[#4153c4] hover:underline">View details →</Link> : null}
  </section>;
}
export function MoneyTotals({ totals }: { totals: Array<{ currency: string; cents: number }> }) {
  return <>{totals.length ? totals.map(row => <span className="block" key={row.currency}>{formatMoney(row.cents, row.currency)}</span>) : <span>{formatMoney(0)}</span>}</>;
}
export function DataNotice({ unavailable }: { unavailable: string[] }) {
  if (!unavailable.length) return null;
  return <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Could not load: {unavailable.join(", ")}. These sections are unavailable; the displayed totals do not include them. Please try refreshing.</div>;
}
export function ExpenseProviderTable({ providers }: { providers: Array<{ provider: string; expenses: Array<{ currency: string; cents: number }>; topUps: Array<{ currency: string; cents: number }> }> }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm">
    <thead className="text-slate-500"><tr><th scope="col" className="py-3">Provider</th><th scope="col" className="px-4 py-3">Recorded expenses</th><th scope="col" className="px-4 py-3">Balance top-ups</th></tr></thead>
    <tbody>{providers.map(row => <tr key={row.provider} className="border-t border-slate-100"><th scope="row" className="py-4 font-medium text-slate-900">{row.provider}</th><td className="px-4 py-4"><MoneyTotals totals={row.expenses} /></td><td className="px-4 py-4"><MoneyTotals totals={row.topUps} /></td></tr>)}</tbody>
  </table>{!providers.length ? <p className="py-6 text-sm text-slate-500">No payments recorded for this period.</p> : null}</div>;
}
