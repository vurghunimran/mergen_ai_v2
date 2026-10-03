"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WithdrawalControls({ id, canProcess, canCancel }: { id: string; canProcess: boolean; canCancel: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function act(action: "sync" | "process" | "cancel") {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/withdrawals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Request failed."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2">
    <div className="flex gap-3">
      <button disabled={busy} onClick={() => act("sync")} className="text-sm text-purple-700 underline disabled:opacity-50">Sync provider status</button>
      {canProcess ? <button disabled={busy} onClick={() => act("process")} className="text-sm text-purple-700 underline disabled:opacity-50">Resume original payout</button> : null}
      {canCancel ? <button disabled={busy} onClick={() => act("cancel")} className="text-sm text-red-700 underline disabled:opacity-50">Cancel unprocessed payout</button> : null}
    </div>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
  </div>;
}
