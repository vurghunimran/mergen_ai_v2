import {
  Bot,
  ChevronRight,
  FileText,
  PenSquare,
  Sparkles,
  Target,
} from "lucide-react";

const steps = [
  {
    icon: Target,
    title: "Define the audience",
    description: "Set the target sample by country, education, age, and matching criteria."
  },
  {
    icon: PenSquare,
    title: "State your research goal",
    description: "Tell MERGEN what you are studying and what decision the research should support."
  },
  {
    icon: Bot,
    title: "Let AI draft your questions",
    description: "AI turns that brief into a strong first questionnaire you can refine in minutes."
  },
  {
    icon: FileText,
    title: "Review results and report",
    description: "Get structured analysis, signal summaries, and report-ready insight recommendations."
  }
] as const;

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[40px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,248,239,0.78)_0%,rgba(255,239,219,0.72)_42%,rgba(255,232,204,0.76)_100%)] px-5 py-14 shadow-[0_26px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:px-8 lg:px-12 lg:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,255,255,0.62),transparent_20%),radial-gradient(circle_at_82%_24%,rgba(255,183,114,0.28),transparent_24%),radial-gradient(circle_at_50%_78%,rgba(216,90,47,0.12),transparent_20%)]" />
          <div className="absolute left-[-5%] top-12 h-52 w-52 rounded-full bg-white/35 blur-3xl" />
          <div className="absolute right-[-6%] top-20 h-64 w-64 rounded-full bg-[#f1a35f]/22 blur-3xl" />

          <div className="relative z-10">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d85a2f]/15 bg-white/75 px-4 py-2 text-sm font-semibold text-[#d85a2f] shadow-[0_12px_24px_rgba(216,90,47,0.08)]">
                <Sparkles className="h-4 w-4" />
                How it works
              </span>
              <h2 className="mt-6 text-3xl font-extrabold tracking-[-0.05em] text-transparent sm:text-4xl lg:text-5xl">
                <span className="bg-[linear-gradient(90deg,#d85a2f_0%,#ef6b39_50%,#ff9c4d_100%)] bg-clip-text">
                  Define Your Audience. Discover Insights. Make Better Decisions.
                </span>
              </h2>
            </div>

            <div className="relative mt-14 overflow-hidden rounded-[34px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,248,240,0.88)_0%,rgba(255,241,226,0.92)_100%)] p-6 shadow-[0_22px_55px_rgba(15,23,42,0.06)] sm:p-7 lg:mt-20 lg:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(255,255,255,0.55),transparent_18%),radial-gradient(circle_at_84%_18%,rgba(255,255,255,0.26),transparent_20%)]" />

              <div className="relative z-10">
                <div className="hidden h-px w-full bg-gradient-to-r from-[#ef8b45]/70 via-[#d85a2f]/80 to-[#f5b06a]/70 xl:block" />

                <div className="mt-8 grid gap-5 lg:grid-cols-2 xl:grid-cols-4 xl:gap-8">
                  {steps.map((step, index) => {
                    const Icon = step.icon;

                    return (
                      <article
                        key={step.title}
                        className="relative rounded-[28px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(255,250,245,0.95)_100%)] p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)]"
                      >
                        <div className="absolute inset-x-0 top-0 h-1 rounded-t-[28px] bg-gradient-to-r from-[#d85a2f] to-[#ffb06d]" />

                        {index < steps.length - 1 ? (
                          <div className="pointer-events-none absolute right-0 top-1/2 z-20 hidden h-10 w-10 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#f1d6c4] bg-white text-[#d85a2f] shadow-[0_14px_30px_rgba(15,23,42,0.08)] xl:flex">
                            <ChevronRight className="h-5 w-5" strokeWidth={2.4} />
                          </div>
                        ) : null}

                        <div className="flex items-center justify-between gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff2e9] text-[#d85a2f] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_22px_rgba(15,23,42,0.06)]">
                            <Icon className="h-6 w-6" />
                          </div>
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#fff1e7] text-sm font-bold text-[#d85a2f]">
                            {index + 1}
                          </span>
                        </div>

                        <h4 className="mt-5 text-xl font-bold leading-tight tracking-[-0.03em] text-slate-900">
                          {step.title}
                        </h4>
                        <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
