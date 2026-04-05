import Link from "next/link";
import { ArrowRight, ChevronRight, Sparkles } from "lucide-react";
import AISection from "@/components/AISection";
import CommunityMap from "@/components/CommunityMap";
import Footer from "@/components/Footer";
import HowItWorks from "@/components/HowItWorks";
import PromoVideo from "@/components/PromoVideo";
import SiteLogo from "@/components/SiteLogo";
import TutorialLink from "@/components/TutorialLink";
import WhoCanUseMergen from "@/components/WhoCanUseMergen";
import { getCommunityMapData } from "@/lib/community-map-data";

const navItems = [
  { href: "#promo-video", label: "Vision" },
  { href: "#who-can-use", label: "Who Uses MERGEN" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#community-map", label: "Community" },
  { href: "#ai-workflow", label: "AI" },
  { href: "/contact", label: "Contact" }
];

export default async function HomePage() {
  const communityMapData = await getCommunityMapData();

  return (
    <main className="landing-shell min-h-screen">
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between rounded-full border border-white/70 bg-white/80 px-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <Link href="/" aria-label="MERGEN home">
              <SiteLogo markClassName="h-9 sm:h-10" />
            </Link>

            <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
              {navItems.map((item) =>
                item.href.startsWith("/") ? (
                  <Link key={item.href} href={item.href} className="transition hover:text-[#d85a2f]">
                    {item.label}
                  </Link>
                ) : (
                  <a key={item.href} href={item.href} className="transition hover:text-[#d85a2f]">
                    {item.label}
                  </a>
                )
              )}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/auth"
                className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:text-[#d85a2f] sm:inline-flex"
              >
                Log in
              </Link>
              <Link
                href="/choose"
                className="inline-flex items-center rounded-full bg-[#d85a2f] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(216,90,47,0.24)] transition hover:bg-[#bf4c25] sm:px-5"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[linear-gradient(115deg,#f4d378_0%,#f7c869_24%,#f5ad58_58%,#eb8541_100%)] pt-28 sm:pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,250,236,0.68),transparent_20%),radial-gradient(circle_at_52%_44%,rgba(255,230,164,0.26),transparent_26%),radial-gradient(circle_at_84%_20%,rgba(255,174,95,0.24),transparent_22%)]" />
        <div className="absolute left-[-6%] top-24 h-[28rem] w-[28rem] rounded-full bg-[#fff1cd]/22 blur-[160px]" />
        <div className="absolute right-[-10%] top-10 h-[30rem] w-[30rem] rounded-full bg-[#d96f34]/22 blur-[160px]" />
        <div className="absolute left-1/2 top-36 h-80 w-80 -translate-x-1/2 rounded-full bg-white/20 blur-[170px]" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative flex min-h-[calc(100vh-7rem)] items-center justify-center pb-20 pt-12">
            <div className="relative w-full max-w-5xl overflow-hidden rounded-[40px] border border-white/45 bg-[linear-gradient(135deg,rgba(255,251,243,0.24)_0%,rgba(255,241,215,0.18)_30%,rgba(255,213,150,0.14)_66%,rgba(244,156,86,0.12)_100%)] px-6 py-16 text-center shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-[4px] sm:px-10 sm:py-20">
              <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.16)_0%,rgba(255,246,225,0.08)_42%,rgba(238,145,70,0.08)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,transparent_0%,rgba(255,208,126,0.10)_100%)]" />

              <div className="relative z-10">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#d85a2f]/15 bg-[#fff2ea] px-4 py-2 text-sm font-semibold text-[#d85a2f] shadow-[0_10px_30px_rgba(216,90,47,0.08)]">
                  <Sparkles className="h-4 w-4" />
                  AI-powered research workflows
                </span>

                <h1 className="mx-auto mt-8 max-w-3xl text-[clamp(3.5rem,8vw,7rem)] font-extrabold leading-[0.92] tracking-[-0.05em] text-slate-900">
                  <span className="landing-text-gradient-cool">Wisdom in</span>{" "}
                  <span className="landing-text-gradient-cool">the</span>{" "}
                  <span className="landing-text-gradient">Data.</span>
                </h1>

                <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl">
                  Launch AI-generated surveys, reach verified communities, and turn raw answers into clear insight reports
                  without slowing your team down.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <Link
                    href="/auth?type=client"
                    className="inline-flex min-w-[240px] items-center justify-center rounded-2xl bg-[#d85a2f] px-6 py-4 text-base font-bold text-white shadow-[0_20px_40px_rgba(216,90,47,0.22)] transition hover:-translate-y-0.5 hover:bg-[#bf4c25]"
                  >
                    Start a survey
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>

                  <Link
                    href="/auth?type=community"
                    className="inline-flex min-w-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-bold text-slate-700 shadow-[0_16px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-[#d85a2f]/30 hover:text-[#d85a2f]"
                  >
                    Answer surveys
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <TutorialLink
                    href="https://youtu.be/MH75YLhUUq0"
                    label="Watch client tutorial"
                    className="min-w-[220px]"
                  />
                  <TutorialLink
                    href="https://youtu.be/o_Ixg_PLclE"
                    label="Watch community tutorial"
                    className="min-w-[220px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#e89a46_0%,#f0b661_14%,#f5cd87_34%,#f9dfb0_56%,#fdf0d7_82%,#fff6e8_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(255,241,210,0.44),transparent_18%),radial-gradient(circle_at_84%_26%,rgba(235,133,65,0.18),transparent_20%),radial-gradient(circle_at_52%_66%,rgba(255,208,126,0.20),transparent_26%)]" />
        <div className="absolute left-[-8%] top-20 h-[30rem] w-[30rem] rounded-full bg-[#efaa57]/18 blur-[170px]" />
        <div className="absolute right-[-10%] top-[28rem] h-[34rem] w-[34rem] rounded-full bg-[#f3bf70]/18 blur-[190px]" />
        <div className="absolute left-1/2 top-[54rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-white/10 blur-[180px]" />

        <div className="relative z-10">
          <PromoVideo />
          <WhoCanUseMergen />
          <HowItWorks />
          <CommunityMap {...communityMapData} />
          <AISection />
          <Footer />
        </div>
      </div>
    </main>
  );
}
