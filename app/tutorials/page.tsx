import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  MonitorPlay,
  PlayCircle,
  Sparkles,
  Users,
  type LucideIcon
} from "lucide-react";
import SiteLogo from "@/components/SiteLogo";
import { cn } from "@/lib/utils";

type TutorialRole = "client" | "community";

type TutorialCard = {
  role: TutorialRole;
  title: string;
  eyebrow: string;
  description: string;
  duration: string;
  youtubeUrl: string;
  youtubeEmbedUrl: string;
  signupHref: string;
  actionLabel: string;
  summary: string;
  icon: LucideIcon;
  iconClassName: string;
  accentClassName: string;
  bullets: string[];
  selectorLabel: string;
};

const tutorials: TutorialCard[] = [
  {
    role: "client",
    title: "Client / Researcher tutorial",
    eyebrow: "Build and launch surveys",
    description:
      "A guided walkthrough for clients who want to create an account, get into the dashboard, and start the survey setup flow with confidence.",
    duration: "1 min 42 sec",
    youtubeUrl: "https://youtu.be/MH75YLhUUq0",
    youtubeEmbedUrl: "https://www.youtube.com/embed/MH75YLhUUq0",
    signupHref: "/auth?type=client",
    actionLabel: "Start as a client",
    summary: "Best if you plan to create surveys, define audiences, and review insights.",
    icon: BarChart3,
    iconClassName: "bg-[#fff1e7] text-[#d85a2f]",
    accentClassName: "border-[#f2cab5] shadow-[0_28px_80px_rgba(216,90,47,0.14)]",
    bullets: [
      "See which signup path to choose and what details to prepare first.",
      "Follow the exact client onboarding steps from account creation to dashboard entry.",
      "Get a quick visual reference before you begin your first survey setup."
    ],
    selectorLabel: "Client tutorial"
  },
  {
    role: "community",
    title: "Community Member tutorial",
    eyebrow: "Join and answer surveys",
    description:
      "A clear video guide for community members who want to sign up, complete their profile, and start joining relevant studies on the platform.",
    duration: "2 min 12 sec",
    youtubeUrl: "https://youtu.be/o_Ixg_PLclE",
    youtubeEmbedUrl: "https://www.youtube.com/embed/o_Ixg_PLclE",
    signupHref: "/auth?type=community",
    actionLabel: "Join the community",
    summary: "Best if you want to create your profile and start answering matched surveys.",
    icon: Users,
    iconClassName: "bg-[#eef3ff] text-[#5672aa]",
    accentClassName: "border-[#dbe4f7] shadow-[0_28px_80px_rgba(86,114,170,0.14)]",
    bullets: [
      "Watch the full community signup path before filling in your details.",
      "See how the profile flow is presented and what information matters most.",
      "Understand how to reach the part of the platform where surveys become available."
    ],
    selectorLabel: "Community tutorial"
  }
];

export const metadata: Metadata = {
  title: "MERGEN Tutorials | Signup walkthroughs",
  description: "Watch the client or community member signup tutorial before creating your MERGEN account."
};

function getSelectedRole(role?: string): TutorialRole | null {
  if (role === "client" || role === "community") {
    return role;
  }

  return null;
}

export default function TutorialsPage({
  searchParams
}: {
  searchParams?: { role?: string };
}) {
  const selectedRole = getSelectedRole(searchParams?.role);
  const orderedTutorials = selectedRole
    ? [...tutorials].sort((left, right) => Number(right.role === selectedRole) - Number(left.role === selectedRole))
    : tutorials;

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(216,90,47,0.16),transparent_20%),radial-gradient(circle_at_top_right,rgba(86,114,170,0.16),transparent_24%),linear-gradient(180deg,#fffdf8_0%,#f8f2ea_46%,#f5eadf_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,241,221,0.88),transparent_18%),radial-gradient(circle_at_82%_14%,rgba(223,231,249,0.72),transparent_18%),radial-gradient(circle_at_50%_100%,rgba(248,213,170,0.44),transparent_26%)]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="rounded-full border border-white/70 bg-white/85 px-5 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" aria-label="MERGEN home">
              <SiteLogo />
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/choose"
                className="inline-flex items-center rounded-full border border-[#ead9cc] bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#d85a2f]/30 hover:text-[#d85a2f]"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign up
              </Link>
              <Link
                href="/"
                className="inline-flex items-center rounded-full bg-[#d85a2f] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(216,90,47,0.22)] transition hover:bg-[#bf4c25]"
              >
                Back to home
              </Link>
            </div>
          </div>
        </header>

        <section className="relative mt-8 overflow-hidden rounded-[40px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92)_0%,rgba(255,247,239,0.94)_42%,rgba(244,247,255,0.92)_100%)] px-6 py-8 shadow-[0_30px_100px_rgba(15,23,42,0.10)] sm:px-10 sm:py-12">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,220,188,0.46),transparent_60%)]" />

          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#f2c8b6] bg-[#fff4ec] px-4 py-2 text-sm font-semibold text-[#d85a2f]">
                <Sparkles className="h-4 w-4" />
                Step-by-step tutorials
              </span>

              <h1 className="mt-6 max-w-3xl text-4xl font-extrabold tracking-[-0.05em] text-slate-900 sm:text-5xl lg:text-6xl">
                Choose a walkthrough before you create your account.
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Watch the exact signup flow for clients or community members, then continue straight into the matching
                MERGEN experience with fewer surprises.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {tutorials.map((tutorial) => (
                  <Link
                    key={tutorial.role}
                    href={`/tutorials?role=${tutorial.role}`}
                    className={cn(
                      "group rounded-[24px] border bg-white/90 p-5 text-left transition hover:-translate-y-0.5",
                      selectedRole === tutorial.role
                        ? "border-transparent bg-slate-900 text-white shadow-[0_22px_48px_rgba(15,23,42,0.16)]"
                        : "border-[#e7d7cb] text-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.06)] hover:border-[#d85a2f]/35"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p
                          className={cn(
                            "text-xs font-semibold uppercase tracking-[0.2em]",
                            selectedRole === tutorial.role ? "text-white/65" : "text-slate-500"
                          )}
                        >
                          {tutorial.eyebrow}
                        </p>
                        <h2 className="mt-3 text-xl font-extrabold tracking-[-0.04em]">{tutorial.selectorLabel}</h2>
                        <p
                          className={cn(
                            "mt-2 text-sm leading-7",
                            selectedRole === tutorial.role ? "text-white/80" : "text-slate-600"
                          )}
                        >
                          {tutorial.role === "client"
                            ? "For researchers and teams launching surveys."
                            : "For people joining the platform to answer surveys."}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition",
                          selectedRole === tutorial.role
                            ? "bg-white/14 text-white"
                            : `${tutorial.iconClassName} group-hover:scale-105`
                        )}
                      >
                        <tutorial.icon className="h-6 w-6" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[30px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff1e7] text-[#d85a2f]">
                  <MonitorPlay className="h-6 w-6" />
                </div>
                <h2 className="mt-5 text-2xl font-extrabold tracking-[-0.04em] text-slate-900">Fast orientation</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Two guided videos, one clean decision. Pick the path that matches your role and follow the exact
                  screens you will see next.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Tutorials</p>
                  <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-slate-900">2</p>
                </div>
                <div className="rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Total watch time</p>
                  <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-slate-900">3 min 54 sec</p>
                </div>
                <div className="rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Best for</p>
                  <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-slate-900">
                    {selectedRole ? (selectedRole === "client" ? "Clients" : "Community") : "Both roles"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6">
          {orderedTutorials.map((tutorial) => {
            const Icon = tutorial.icon;
            const isSelected = tutorial.role === selectedRole;

            return (
              <article
                key={tutorial.role}
                className={cn(
                  "rounded-[36px] border border-white/80 bg-white/82 p-5 shadow-[0_26px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-7 lg:p-8",
                  isSelected && tutorial.accentClassName
                )}
              >
                <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl", tutorial.iconClassName)}>
                        <Icon className="h-7 w-7" />
                      </div>

                      {isSelected ? (
                        <span className="inline-flex items-center rounded-full border border-[#d85a2f]/15 bg-[#fff3ec] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#d85a2f]">
                          Recommended for you
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{tutorial.eyebrow}</p>
                    <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em] text-slate-900 sm:text-[2.2rem]">
                      {tutorial.title}
                    </h2>
                    <p className="mt-4 text-base leading-8 text-slate-600">{tutorial.description}</p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#ead9cc] bg-[#fffaf5] px-4 py-2 text-sm font-semibold text-slate-700">
                        <Clock3 className="h-4 w-4 text-[#d85a2f]" />
                        {tutorial.duration}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#ead9cc] bg-[#fffaf5] px-4 py-2 text-sm font-semibold text-slate-700">
                        <BookOpen className="h-4 w-4 text-[#d85a2f]" />
                        Guided walkthrough
                      </span>
                    </div>

                    <p className="mt-6 rounded-[24px] border border-[#eee1d7] bg-[#fffaf5] px-5 py-4 text-sm leading-7 text-slate-600">
                      {tutorial.summary}
                    </p>

                    <div className="mt-6 space-y-3">
                      {tutorial.bullets.map((bullet) => (
                        <div key={bullet} className="flex items-start gap-3 rounded-[20px] border border-[#f2e6dd] bg-[#fffdfb] px-4 py-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#d85a2f]" />
                          <p className="text-sm leading-7 text-slate-600">{bullet}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <Link
                        href={tutorial.signupHref}
                        className="inline-flex items-center rounded-full bg-[#d85a2f] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(216,90,47,0.22)] transition hover:bg-[#bf4c25]"
                      >
                        {tutorial.actionLabel}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                      <Link
                        href="/choose"
                        className="inline-flex items-center rounded-full border border-[#ead9cc] bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#d85a2f]/35 hover:text-[#d85a2f]"
                      >
                        Go to sign up choices
                      </Link>
                      <Link
                        href={tutorial.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-full border border-[#ead9cc] bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#d85a2f]/35 hover:text-[#d85a2f]"
                      >
                        Watch on YouTube
                        <PlayCircle className="ml-2 h-4 w-4" />
                      </Link>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[30px] border border-[#f0dfd4] bg-[#121212] p-3 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
                    <div className="mb-3 flex items-center justify-between px-2 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                        {tutorial.role === "client" ? "Client flow" : "Community flow"}
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black">
                      <iframe
                        src={tutorial.youtubeEmbedUrl}
                        title={tutorial.title}
                        className="aspect-video w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
