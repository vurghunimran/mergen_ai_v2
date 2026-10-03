import Link from "next/link";
import { getProductionReadiness } from "@/lib/production-readiness";
import { requireAdminProfile } from "@/lib/admin-access";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function IntegrationsPage() {
  await requireAdminProfile();
  const checks = await getProductionReadiness();
  return (
    <section className="space-y-6 rounded-[32px] border border-white/70 bg-white/80 p-6 sm:p-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Production integrations</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">Checks run against the deployed credentials and read provider configuration. They do not create payments, orders, or messages. Verified access does not replace a real checkout, payout, or delivery test.</p>
        <p className="mt-2 text-xs text-slate-500">Checked {new Date().toISOString()}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {checks.map(item => (
          <article key={item.service} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">{item.service}</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === "verified" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{item.status === "verified" ? "Access verified" : item.status === "blocked" ? "Setup needed" : "Needs verification"}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.detail}</p>
            {item.missing.length ? <p className="mt-3 break-words text-xs leading-6 text-slate-600">Environment variables: {item.missing.join(", ")}</p> : null}
          </article>
        ))}
      </div>
      <p className="text-sm text-slate-600">Cash withdrawals use 920 credits = $10 USD. Gift redemption remains disabled until you choose products and pricing and finish fulfillment setup.</p>
      <div className="flex flex-wrap gap-4 text-sm font-medium text-[#4153c4]">
        <Link href="/dashboard/admin/integrations" className="underline">Run checks again</Link>
        <Link href="/dashboard/admin/rewards" className="underline">Review production reward catalog</Link>
        <Link href="/dashboard/admin/withdrawals" className="underline">Review cash withdrawals</Link>
      </div>
    </section>
  );
}
