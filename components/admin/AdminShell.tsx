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
        <header className="rounded-[28px] border border-white/70 bg-white/75 p-5 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Site
              </Link>
              <div className="inline-flex items-center justify-center gap-2 rounded-full bg-[#151b3b] px-3 py-2 text-xs font-semibold text-white">
                <ShieldCheck className="h-4 w-4" />
                Owner only
              </div>
            </div>
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Your business at a glance.</h1>
          <p className="mt-2 break-words text-xs text-slate-500 sm:text-sm">{displayName} · {profile.email}</p>
          <div className="mt-5"><AdminNav /></div>
        </header>

        <main className="mt-6">{children}</main>
      </div>
    </div>
  );
}
