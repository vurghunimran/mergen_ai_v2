"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { expenseCurrencies, expenseProviders, formatMoney, type ExpenseRow } from "@/lib/admin-metrics";

export default function ExpenseLedger({ rows, today }: { rows: ExpenseRow[]; today: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [voidId, setVoidId] = useState<string | null>(null);
  const [provider, setProvider] = useState("all");
  const [showVoided, setShowVoided] = useState(false);
  const entryId = useRef<string | null>(null);
  const submitted = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const signature = JSON.stringify(values);
    if (signature !== submitted.current || !entryId.current) { entryId.current = crypto.randomUUID(); submitted.current = signature; }
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, id: entryId.current }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save the expense.");
      formRef.current?.reset(); entryId.current = null; submitted.current = null;
      setNotice("Payment recorded. It appears under its payment date’s period."); router.refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save. Please retry."); }
    finally { setBusy(false); }
  }
  async function voidEntry(id: string) {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin/expenses", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not void the entry.");
      setVoidId(null); setNotice("Entry voided. It is excluded from totals and kept in the audit history."); router.refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not void the entry."); }
    finally { setBusy(false); }
  }
  const visible = rows.filter(row => (showVoided || !row.voided_at) && (provider === "all" || row.provider === provider));
  const input = "mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal text-slate-900";
  return <div className="space-y-6">
    <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold text-slate-900">Record a payment</h3><p className="mt-2 text-sm text-slate-500">Use the amount and currency on your receipt. A balance top-up is tracked separately from an expense.</p>
      <form ref={formRef} onSubmit={save} className="mt-5"><fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 disabled:opacity-60">
        <label className="text-sm font-medium text-slate-600">Provider<select required name="provider" className={input}>{expenseProviders.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-600">Payment type<select name="kind" className={input}><option value="expense">Expense / invoice payment</option><option value="top_up">Prepaid balance top-up</option></select></label>
        <label className="text-sm font-medium text-slate-600">Payment date<input required type="date" name="paid_on" defaultValue={today} max={today} min="2000-01-01" className={input} /></label>
        <label className="text-sm font-medium text-slate-600">Amount<input required name="amount" type="number" min="0.01" max="1000000" step="0.01" placeholder="0.00" className={input} /></label>
        <label className="text-sm font-medium text-slate-600">Currency<select name="currency" className={input}>{expenseCurrencies.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-600">Invoice / receipt reference (optional)<input name="reference" maxLength={120} className={input} /></label>
        <label className="text-sm font-medium text-slate-600 sm:col-span-2 lg:col-span-3">Description<input required name="description" maxLength={500} placeholder="For example: Vercel hosting — October invoice" className={input} /></label>
        <button className="w-fit rounded-xl bg-[#202a6b] px-5 py-3 text-sm font-semibold text-white">{busy ? "Saving…" : "Record payment"}</button>
      </fieldset></form>
      <p role="status" aria-live="polite" className="mt-4 text-sm text-[#4153c4]">{notice}</p>
    </section>
    <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-4"><h3 className="text-lg font-semibold text-slate-900">Payment history</h3><div className="flex flex-wrap items-center gap-4"><label className="text-sm text-slate-600">Provider<select value={provider} onChange={e => setProvider(e.target.value)} className={input}><option value="all">All providers</option>{expenseProviders.map(value => <option key={value}>{value}</option>)}</select></label><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showVoided} onChange={e => setShowVoided(e.target.checked)} />Show voided</label></div></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-slate-500"><tr>{["Payment date", "Provider / description", "Type", "Amount", "Actions"].map(value => <th scope="col" className="px-3 py-3 first:pl-0" key={value}>{value}</th>)}</tr></thead><tbody>{visible.map(row => <tr key={row.id} className={`border-t border-slate-100 ${row.voided_at ? "text-slate-400" : "text-slate-700"}`}><td className="whitespace-nowrap py-4 pr-3">{row.paid_on}</td><td className="max-w-[340px] px-3 py-4"><p className="font-medium">{row.provider}</p><p className="mt-1 break-words text-xs">{row.description}</p>{row.reference ? <p className="mt-1 break-all text-xs text-slate-500">Ref: {row.reference}</p> : null}</td><td className="px-3 py-4">{row.kind === "top_up" ? "Top-up" : "Expense"}</td><td className="whitespace-nowrap px-3 py-4 font-medium">{formatMoney(row.amount_cents, row.currency)}</td><td className="px-3 py-4">{row.voided_at ? "Voided" : voidId === row.id ? <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => voidEntry(row.id)} className="text-red-700 disabled:opacity-40">Confirm void</button><button disabled={busy} onClick={() => setVoidId(null)} className="text-slate-500">Cancel</button></div> : <button disabled={busy} onClick={() => setVoidId(row.id)} className="text-slate-500 hover:text-red-700 disabled:opacity-40" aria-label={`Void ${row.provider} payment on ${row.paid_on}`}>Void</button>}</td></tr>)}</tbody></table>{!visible.length ? <p className="py-8 text-center text-sm text-slate-500">No recorded payments match this period and filter.</p> : null}</div>
    </section>
  </div>;
}
