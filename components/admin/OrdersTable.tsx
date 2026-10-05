"use client";
import { useState } from "react";
import { bakuDate, formatMoney, type OrderRecord } from "@/lib/admin-metrics";

const states: Record<string, string> = { pending: "Unpaid", paid: "Paid, awaiting publication", fulfilled: "Survey published", review: "Needs review", refunded: "Refunded", unknown: "Fulfillment unavailable" };
export default function OrdersTable({ orders }: { orders: OrderRecord[] }) {
  const [search, setSearch] = useState("");
  const [state, setState] = useState("all");
  const [environment, setEnvironment] = useState("all");
  const [page, setPage] = useState(0);
  const filtered = orders.filter(row => (state === "all" || row.state === state) && (environment === "all" || row.provider_environment === environment) && [row.customer, row.survey, row.id, row.checkout_id ?? ""].some(value => value.toLowerCase().includes(search.trim().toLowerCase())));
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const current = Math.min(page, pages - 1);
  const shown = filtered.slice(current * 25, (current + 1) * 25);
  return <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
    <div className="flex flex-wrap gap-3"><label className="min-w-0 flex-1 text-sm font-medium text-slate-600">Search orders<input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Customer, survey or order ID" className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
      <label className="text-sm font-medium text-slate-600">Status<select value={state} onChange={e => { setState(e.target.value); setPage(0); }} className="mt-1 block max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="all">All statuses</option>{Object.entries(states).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-600">Environment<select value={environment} onChange={e => { setEnvironment(e.target.value); setPage(0); }} className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="all">All environments</option><option value="production">Live</option><option value="sandbox">Sandbox</option><option value="unknown">Unclassified</option></select></label>
    </div>
    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-slate-500"><tr>{["Order / customer", "Survey", "Value", "Status", "Created (Baku)"].map(label => <th key={label} scope="col" className="px-3 py-3 first:pl-0">{label}</th>)}</tr></thead><tbody>{shown.map(row => <tr className="border-t border-slate-100" key={row.id}>
      <td className="max-w-[220px] py-4 pr-3"><p className="font-medium text-slate-900">{row.customer}</p><p className="mt-1 break-all text-xs text-slate-500">{row.id}</p></td>
      <td className="max-w-[280px] px-3 py-4"><p className="font-medium text-slate-900">{row.survey}</p><p className="mt-1 text-xs text-slate-500">{row.question_count} questions · {row.response_count} requested responses{row.include_detailed_report ? " · AI summary" : ""}</p></td>
      <td className="whitespace-nowrap px-3 py-4">{formatMoney(row.total_cents, row.currency)}</td><td className="px-3 py-4"><span className={`inline-block rounded-full px-3 py-1.5 text-xs font-medium ${row.state === "fulfilled" ? "bg-emerald-50 text-emerald-800" : row.state === "refunded" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-900"}`}>{states[row.state]}</span><p className="mt-1 text-xs text-slate-500">{row.provider_environment === "production" ? "Live" : row.provider_environment === "sandbox" ? "Sandbox" : "Unclassified"}</p></td><td className="whitespace-nowrap px-3 py-4 text-slate-500">{bakuDate(row.created_at)}</td>
    </tr>)}</tbody></table>{!shown.length ? <p className="py-10 text-center text-sm text-slate-500">{orders.length ? "No orders match these filters." : "No survey orders in this period yet."}</p> : null}</div>
    <div className="mt-5 flex items-center justify-between gap-3 text-sm"><p className="text-slate-500">{filtered.length} orders · Page {current + 1} of {pages}</p><div className="flex gap-2"><button disabled={!current} onClick={() => setPage(current - 1)} className="rounded-xl border px-3 py-2 disabled:opacity-40">Previous</button><button disabled={current + 1 >= pages} onClick={() => setPage(current + 1)} className="rounded-xl border px-3 py-2 disabled:opacity-40">Next</button></div></div>
  </section>;
}
