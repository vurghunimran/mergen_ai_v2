"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Wallet, X } from "lucide-react";

type Withdrawal = { id: string; credits: number; amountCents: number; currency: string; status: string;
  createdAt: string; targetAmount: string | null; targetCurrency: string | null };
const terminal = new Set(["processed", "failed", "returned"]);
const statusLabels: Record<string, string> = { queued: "Queued", submitting: "Submitting", review: "Awaiting review",
  processing: "Processing", processed: "Sent by Trolley", failed: "Failed — credits restored", returned: "Returned — credits restored" };

export default function CashWithdrawalPanel({ memberId, availableCredits, onBalanceChange }: {
  memberId: string; availableCredits: number; onBalanceChange: () => Promise<void>;
}) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [widgetUrl, setWidgetUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [retryCredits, setRetryCredits] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const locked = useRef(false);
  const storageKey = `mergen-cash-withdrawal:v1:${memberId}`;
  const load = useCallback(async () => {
    const response = await fetch("/api/withdrawals", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not load withdrawals.");
    setEnabled(data.enabled === true);
    setWithdrawals(data.withdrawals);
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      const pending = JSON.parse(saved);
      if (data.withdrawals.some((row: Withdrawal) => row.id === pending.id && terminal.has(row.status))) {
        window.localStorage.removeItem(storageKey);
        setRetryCredits(null);
      } else setRetryCredits(pending.credits);
    } else setRetryCredits(null);
  }, [storageKey]);
  useEffect(() => {
    let cancelled = false;
    load().catch(err => { if (!cancelled) setError(err.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [load]);
  useEffect(() => {
    if (detailsOpen && !dialog.current?.open) dialog.current?.showModal();
    if (!detailsOpen && dialog.current?.open) dialog.current.close();
  }, [detailsOpen]);

  async function act(action: "onboard" | "withdraw" | "refresh") {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(""); setNotice("");
    try {
      if (action === "refresh") { await Promise.all([load(), onBalanceChange()]); return; }
      let body: string | undefined;
      if (action === "withdraw") {
        let pending = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
        if (!pending) {
          pending = { credits, idempotencyKey: crypto.randomUUID() };
          window.localStorage.setItem(storageKey, JSON.stringify(pending));
        }
        setRetryCredits(pending.credits);
        body = JSON.stringify({ credits: pending.credits, idempotencyKey: pending.idempotencyKey });
      }
      const response = await fetch(action === "onboard" ? "/api/withdrawals/onboarding" : "/api/withdrawals", {
        method: "POST", headers: { "Content-Type": "application/json" }, body
      });
      const data = await response.json();
      if (!response.ok) {
        // Validation failures happen before reservation. Ambiguous errors retain the retry key.
        if (action === "withdraw" && [400, 409].includes(response.status)) {
          window.localStorage.removeItem(storageKey); setRetryCredits(null);
        }
        throw new Error(data.error ?? "Could not complete withdrawal.");
      }
      if (action === "onboard") setWidgetUrl(data.url);
      else {
        const pending = JSON.parse(window.localStorage.getItem(storageKey)!);
        window.localStorage.setItem(storageKey, JSON.stringify({ ...pending, id: data.withdrawal.id }));
        setNotice(data.message);
        await Promise.all([load(), onBalanceChange()]);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Could not complete request."); }
    finally { locked.current = false; setBusy(false); }
  }
  const pending = withdrawals.some(row => !terminal.has(row.status));
  const credits = 920;
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-[#e6e1f0] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
      <div className="flex h-36 items-center justify-center bg-[#f5f2fb] px-6">
        <Wallet className="h-16 w-16 text-[#6d3fd1]" strokeWidth={1.5} aria-hidden="true" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl font-bold tracking-[-0.03em] text-[#1f2937]">Cash withdrawal</h3>
        <p className="mt-1 text-xs text-[#64748b]">Cash Withdraw</p>
        <p className="mt-3 text-lg font-semibold text-[#334155]">USD 10.00</p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div><p className="text-xs text-[#64748b]">Required credits</p><p className="mt-1 text-2xl font-bold text-[#4f2a78]">920</p></div>
          <button type="button" disabled={loading || !enabled} onClick={() => setDetailsOpen(true)} className="rounded-full bg-[#f0e9fa] px-4 py-2 text-sm font-semibold text-[#6d3fd1] disabled:cursor-not-allowed">{loading ? "Loading…" : enabled ? "View details" : "Coming soon"}</button>
        </div>
        {error && !detailsOpen ? <p role="alert" className="mt-3 text-xs text-red-700">{error}</p> : null}
      </div>
      <dialog ref={dialog} aria-labelledby={titleId} onClose={() => setDetailsOpen(false)} className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl rounded-3xl border border-purple-200 bg-white p-6 backdrop:bg-slate-900/40">
      <div className="flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-xl font-bold text-slate-900">Cash withdrawal</h2>
        <button type="button" autoFocus aria-label="Close withdrawal details" onClick={() => setDetailsOpen(false)} className="rounded-full p-2 text-slate-600 hover:bg-slate-100"><X className="h-5 w-5" aria-hidden="true" /></button>
      </div>
      <p className="mt-2 text-sm text-slate-600">920 credits · $10 USD · Bank transfer</p>
      <p className="mt-2 text-xs text-slate-500">Bank verification is required. Conversion, withholding and bank fees may affect the amount received.</p>
      {loading ? <p className="mt-4 text-sm">Loading withdrawals…</p> : !enabled ? (
        <p className="mt-4 text-sm text-purple-900">Coming soon</p>
      ) : (
        <div className="mt-5 space-y-4">
          <button type="button" disabled={busy} onClick={() => act("onboard")} className="rounded-xl border border-purple-200 px-4 py-2 text-sm font-semibold disabled:opacity-50">Set up bank details</button>
          {widgetUrl ? <div>
            <iframe title="Trolley bank details and verification" src={widgetUrl} referrerPolicy="no-referrer" className="h-[620px] w-full rounded-xl border" />
            <button type="button" onClick={() => setWidgetUrl("")} className="mt-2 text-sm underline">Close bank setup</button>
          </div> : null}
          <div className="flex flex-wrap items-end gap-3">
            <p className="text-sm font-medium text-slate-700">920 credits — $10 USD</p>
            <button type="button" disabled={busy || pending || (retryCredits === null && availableCredits < credits)} onClick={() => act("withdraw")} className="rounded-xl bg-purple-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Please wait…" : retryCredits !== null && !pending ? `Retry original $${retryCredits / 920 * 10} request` : "Request withdrawal"}</button>
          </div>
          {pending ? <p className="text-sm text-slate-600">A withdrawal is in progress. Its credits are reserved while it is processed or reviewed.</p> : null}
        </div>
      )}
      {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
      {notice ? <p role="status" className="mt-4 text-sm text-green-800">{notice}</p> : null}
      <button type="button" onClick={() => act("refresh")} disabled={busy || loading} className="mt-4 text-sm font-semibold text-purple-700 underline disabled:opacity-50">Refresh balance and status</button>
      {withdrawals.length ? <ul className="mt-4 divide-y divide-slate-100">
        {withdrawals.map(row => <li key={row.id} className="py-3 text-sm">
          <p className="font-semibold">${(row.amountCents / 100).toFixed(2)} USD · {row.credits} credits · {statusLabels[row.status] ?? row.status}</p>
          <p className="mt-1 text-slate-500">{new Date(row.createdAt).toLocaleString()}{row.targetAmount && row.targetCurrency ? ` · Payout amount: ${row.targetAmount} ${row.targetCurrency}` : ""}</p>
        </li>)}
      </ul> : null}
      </dialog>
    </article>
  );
}
