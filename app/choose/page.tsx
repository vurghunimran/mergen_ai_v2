import Link from "next/link";
import { ArrowRight, BarChart3, Users } from "lucide-react";
import SiteLogo from "@/components/SiteLogo";
import TutorialLink from "@/components/TutorialLink";

export default function ChoosePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(216,90,47,0.12),transparent_22%),radial-gradient(circle_at_top_right,rgba(123,147,178,0.18),transparent_22%),linear-gradient(180deg,#fffdf9_0%,#f7f2eb_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-full border border-white/70 bg-white/85 px-5 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" aria-label="MERGEN home">
              <SiteLogo />
            </Link>

            <Link
              href="/"
              className="rounded-full border border-[#ead9cc] bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#d85a2f]/30 hover:text-[#d85a2f]"
            >
              Back to home
            </Link>
          </div>
        </header>

        <div className="mx-auto mt-12 max-w-4xl text-center">
          <span className="inline-flex rounded-full border border-[#f2c8b6] bg-[#fff4ec] px-4 py-2 text-sm font-semibold text-[#d85a2f]">
            Sign up
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-[-0.04em] text-slate-900 sm:text-5xl">Choose your path</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Select the experience that matches your role, then continue in the same design language as the landing page.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="rounded-[32px] border border-white/70 bg-white/80 p-8 text-left shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff1e7] text-[#d85a2f]">
                <BarChart3 className="h-7 w-7" />
              </div>
              <h2 className="mt-6 text-2xl font-extrabold tracking-[-0.04em] text-slate-900">Client / Researcher</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">Set up surveys, define the audience, and turn responses into usable insight.</p>
              <Link
                href="/auth?type=client"
                className="mt-7 inline-flex items-center rounded-full bg-[#d85a2f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#bf4c25]"
              >
                Start survey setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <TutorialLink href="/tutorials?role=client" label="Watch client tutorial" className="mt-3" />
            </article>

            <article className="rounded-[32px] border border-white/70 bg-white/80 p-8 text-left shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff1e7] text-[#d85a2f]">
                <Users className="h-7 w-7" />
              </div>
              <h2 className="mt-6 text-2xl font-extrabold tracking-[-0.04em] text-slate-900">Community Member</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">Build your profile, join relevant studies, and answer surveys that fit your background.</p>
              <Link
                href="/auth?type=community"
                className="mt-7 inline-flex items-center rounded-full bg-[#d85a2f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#bf4c25]"
              >
                Join community
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <TutorialLink href="/tutorials?role=community" label="Watch community tutorial" className="mt-3" />
            </article>
          </div>
        </div>
      </div>
    </main>
  );
}
