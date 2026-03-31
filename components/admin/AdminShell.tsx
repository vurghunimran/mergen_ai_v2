import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import SiteLogo from "@/components/SiteLogo";
import type { UserProfile } from "@/lib/supabase/types";
import AdminNav from "./AdminNav";

export default function AdminShell({
  profile,
  children
}: {
  profile: UserProfile;
  children: React.ReactNode;
}) {
  const displayName = `${profile.firstName} ${profile.lastName}`.trim() || profile.email;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(242,244,251,0.95)_45%,_rgba(236,240,250,1)_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[36px] border border-white/70 bg-white/75 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <Link
                href="/"
                aria-label="Go to landing page"
                className="inline-flex items-center transition-opacity hover:opacity-85"
              >
                <SiteLogo
                  label="MERGEN AI"
                  markClassName="h-11"
                  textClassName="text-[18px] font-semibold text-slate-900"
                />
              </Link>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-[#4153c4]">
                Owner Admin Panel
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-slate-900 sm:text-4xl">
                Private oversight across surveys, rewards, and community health.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                This area stays server-protected and is only available to the dedicated account set
                in `ADMIN_EMAIL`.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to site
              </Link>
              <div className="inline-flex items-center justify-center gap-2 rounded-full bg-[#151b3b] px-5 py-3 text-sm font-semibold text-white">
                <ShieldCheck className="h-4 w-4" />
                Owner only
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <AdminNav />

            <div className="rounded-[28px] bg-[linear-gradient(135deg,#151b3b_0%,#263386_100%)] p-5 text-white shadow-[0_24px_55px_rgba(21,27,59,0.28)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#cdd3ff]">
                Signed in
              </p>
              <p className="mt-3 text-xl font-semibold tracking-[-0.03em]">{displayName}</p>
              <p className="mt-1 text-sm text-[#dde3ff]">{profile.email}</p>
              <div className="mt-5 grid gap-3 text-sm text-[#dde3ff]">
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                  Your normal role stays `{profile.role}`.
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                  Admin access is attached to your dedicated client login email.
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mt-6">{children}</main>
      </div>
    </div>
  );
}
