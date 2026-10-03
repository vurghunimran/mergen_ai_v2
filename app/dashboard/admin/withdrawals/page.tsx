import { createAdminClient } from "@/lib/supabase/admin";
import { cashWithdrawalsEnabled, trolleyConfigured, trolleyMode } from "@/lib/trolley";
import { requireAdminProfile } from "@/lib/admin-access";
import WithdrawalControls from "@/components/admin/WithdrawalControls";
import type { CashWithdrawal } from "@/lib/cash-withdrawals";

export const dynamic = "force-dynamic";
export default async function WithdrawalsPage() {
  await requireAdminProfile();
  const { data, error } = await createAdminClient().from("cash_withdrawals").select("*").order("created_at", { ascending: false }).limit(100);
  const enabled = cashWithdrawalsEnabled();
  return <section className="space-y-5 rounded-3xl bg-white p-6">
    <h2 className="text-2xl font-bold text-slate-900">Cash withdrawals</h2>
    <p className="text-sm text-slate-600">920 credits = $10 USD. Trolley environment: {trolleyMode()}. Credentials: {trolleyConfigured() ? "configured" : "missing"}. Member withdrawals: {enabled ? "enabled for approved countries" : "disabled"}.</p>
    <p className="text-sm text-slate-600">Provider failures and returned payments restore credits automatically. Requests awaiting review keep their credits reserved; sync their original batch before resuming.</p>
    {error ? <p role="alert" className="text-sm text-amber-800">Withdrawal storage is not ready. Apply the Trolley database migration.</p> : null}
    {!error && !data?.length ? <p className="text-sm text-slate-500">No withdrawals yet.</p> : null}
    <ul className="divide-y divide-slate-100">
      {(data as CashWithdrawal[] | null)?.map(row => <li key={row.id} className="space-y-2 py-4">
        <p className="font-semibold">${(row.amount_cents / 100).toFixed(2)} USD · {row.credits} credits · {row.status}</p>
        <p className="break-all text-xs text-slate-500">Withdrawal {row.id} · Member {row.member_id} · Batch {row.batch_id ?? "not recorded"} · Payment {row.payment_id ?? "not recorded"}</p>
        <WithdrawalControls id={row.id} canProcess={enabled && ["queued", "submitting", "review"].includes(row.status)}
          canCancel={trolleyConfigured("live") && ["submitting", "review", "processing"].includes(row.status)} />
      </li>)}
    </ul>
  </section>;
}
