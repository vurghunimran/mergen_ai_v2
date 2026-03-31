import Link from "next/link";
import { ArrowLeft, MonitorPlay } from "lucide-react";
import SiteLogo from "@/components/SiteLogo";
import AdminNav from "./AdminNav";

export default function LocalAdminPreviewShell({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(243,247,255,0.98)_45%,_rgba(233,240,251,1)_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[36px] border border-white/70 bg-white/80 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur">
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
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-[#2b5fab]">
                Local Admin Preview
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-slate-900 sm:text-4xl">
                Separate admin preview website powered by the same live app data.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                This route is only available on localhost, skips login, and reuses the real survey,
                reward, and community analytics loaders.
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
              <div className="inline-flex items-center justify-center gap-2 rounded-full bg-[#16325c] px-5 py-3 text-sm font-semibold text-white">
                <MonitorPlay className="h-4 w-4" />
                Local only
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <AdminNav basePath="/local-admin-preview" />

            <div className="rounded-[28px] bg-[linear-gradient(135deg,#16325c_0%,#296eb4_100%)] p-5 text-white shadow-[0_24px_55px_rgba(22,50,92,0.28)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6e6ff]">
                Preview mode
              </p>
              <p className="mt-3 text-xl font-semibold tracking-[-0.03em]">
                Local dashboard sandbox
              </p>
              <p className="mt-1 text-sm text-[#ebf3ff]">
                Perfect for design review, layout validation, and checking live analytics locally.
              </p>
              <div className="mt-5 grid gap-3 text-sm text-[#ebf3ff]">
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                  No login required on localhost.
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                  Uses the same analytics loaders as the main admin panel.
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
