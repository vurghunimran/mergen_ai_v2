import Link from "next/link";
import { ArrowRight, CircleCheck, CircleX } from "lucide-react";
import SiteLogo from "@/components/SiteLogo";
import { safeVerificationPath } from "@/lib/security/redirect";

type ConfirmationPageProps = {
  searchParams: Promise<{ result?: string; next?: string }>;
};

export default async function ConfirmationPage({ searchParams }: ConfirmationPageProps) {
  const { result, next } = await searchParams;
  const confirmed = result === "success";
  const destination = safeVerificationPath(next ?? null);
  const dashboardPath = destination.startsWith("/dashboard/") ? destination : null;
  const actionHref = confirmed && dashboardPath ? dashboardPath : "/auth?mode=login";
  const actionLabel = confirmed && dashboardPath ? "Open dashboard" : "Sign in";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(216,90,47,0.1),transparent_24%),linear-gradient(180deg,#fffdf9,#f7f2eb)] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" aria-label="MERGEN home" className="inline-flex"><SiteLogo /></Link>
        <section className="mx-auto mt-12 max-w-md rounded-[32px] border border-[#ead9cc] bg-white p-7 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-9">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${confirmed ? "bg-[#fff0e8] text-[#d85a2f]" : "bg-red-50 text-red-600"}`}>
            {confirmed ? <CircleCheck size={34} strokeWidth={2} /> : <CircleX size={34} strokeWidth={2} />}
          </div>
          <h1 className="mt-6 text-3xl font-bold text-slate-900">
            {confirmed ? "Email confirmed" : "Link no longer works"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {confirmed
              ? dashboardPath
                ? "Your MERGEN account is ready. You can continue to your dashboard."
                : "Your MERGEN account is ready. Sign in to continue."
              : "This confirmation link may have expired or already been used. If your account is active, you can sign in."}
          </p>
          <Link href={actionHref} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d85a2f] px-5 py-3 font-semibold text-white hover:bg-[#bd4826]">
            {actionLabel}<ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link href="/" className="mt-5 inline-block text-sm font-semibold text-[#d85a2f] hover:underline">
            Back to home
          </Link>
        </section>
      </div>
    </main>
  );
}
