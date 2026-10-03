"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
    <div className="rounded-3xl border border-purple-200 bg-white p-6">
      <h2 className="text-xl font-bold text-slate-900">Cash withdrawal</h2>
      <p className="mt-2 text-sm text-slate-600">Each cash withdrawal is fixed at 920 credits for $10 USD.</p>
      <p className="mt-2 text-sm text-slate-600">Complete your bank details and any required verification with Trolley. Local currency conversion, required withholding, and receiving-bank charges may affect the final amount.</p>
      {loading ? <p className="mt-4 text-sm">Loading withdrawals…</p> : !enabled ? (
        <p className="mt-4 rounded-xl bg-purple-50 p-4 text-sm text-purple-900">Cash withdrawals are coming soon for your country. Your earned credits remain in your account.</p>
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
    </div>
  );
}
