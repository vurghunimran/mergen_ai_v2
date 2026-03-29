import { ArrowRight, BarChart3, Bot, Filter, PenSquare, Sparkles } from "lucide-react";

const steps = [
  {
    badge: "01",
    eyebrow: "Set the direction",
    icon: PenSquare,
    title: "Start with your research goal",
    description: "Share the topic, target group, and the decision you want this study to support.",
    outcome: "A clear brief in a few lines"
  },
  {
    badge: "02",
    eyebrow: "Shape the draft",
    icon: Bot,
    title: "Let AI draft the first version",
    description: "Mergen turns that brief into a survey structure and a thoughtful first set of questions.",
    outcome: "Less setup, faster momentum"
  },
  {
    badge: "03",
    eyebrow: "Focus the sample",
    icon: Filter,
    title: "Refine the audience fit",
    description: "Choose the people you need by country, education, age, profession, and matching criteria.",
    outcome: "Better targeting, less noise"
  },
  {
    badge: "04",
    eyebrow: "Turn answers into action",
    icon: BarChart3,
    title: "Review clear, usable results",
    description: "See structured outputs, key signals, and next-step recommendations you can actually use.",
    outcome: "Insight you can act on"
  }
];

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
                  From research idea to insight, in one fluent flow.
                </span>
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Start with a short prompt, let AI build the first draft, focus the right audience, and move into clear
                results without losing momentum.
              </p>
            </div>

            <div className="relative mt-14 lg:mt-20">
              <div className="pointer-events-none absolute inset-x-6 top-20 hidden lg:block">
                <svg viewBox="0 0 1200 220" className="h-[220px] w-full" aria-hidden="true">
                  <defs>
                    <linearGradient id="how-it-works-path" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f2b16b" stopOpacity="0.55" />
                      <stop offset="50%" stopColor="#e97d3c" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#f2b16b" stopOpacity="0.55" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M20 110 C 150 26, 250 26, 330 110 S 510 194, 620 110 S 810 26, 920 110 S 1085 194, 1180 110"
                    fill="none"
                    stroke="url(#how-it-works-path)"
                    strokeDasharray="8 10"
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                </svg>
              </div>

              <div className="grid gap-6 lg:grid-cols-4 lg:items-start">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const desktopOffset = index % 2 === 0 ? "lg:-translate-y-3" : "lg:translate-y-10";

                  return (
                    <article
                      key={step.title}
                      className={`group relative overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.74)_0%,rgba(255,248,239,0.92)_100%)] p-6 shadow-[0_22px_55px_rgba(15,23,42,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.10)] ${desktopOffset}`}
                    >
                      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,rgba(216,90,47,0.95)_0%,rgba(255,170,92,0.72)_100%)]" />
                      <div className="absolute right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#f2d2bd] bg-white/90 text-sm font-bold text-[#d85a2f] shadow-[0_10px_20px_rgba(216,90,47,0.08)]">
                        {step.badge}
                      </div>

                      <div className="flex items-start gap-4 pr-12">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[linear-gradient(180deg,#fff4ea_0%,#ffe7d2_100%)] text-[#d85a2f] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_24px_rgba(216,90,47,0.10)]">
                          <Icon className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d85a2f]/75">
                            {step.eyebrow}
                          </p>
                        </div>
                      </div>

                      <h3 className="mt-6 text-[1.65rem] font-extrabold leading-tight tracking-[-0.03em] text-slate-900">
                        {step.title}
                      </h3>
                      <p className="mt-3 text-[15px] leading-7 text-slate-600">{step.description}</p>

                      <div className="mt-6 flex items-center justify-between rounded-2xl border border-[#f3d6c2] bg-white/70 px-4 py-3">
                        <span className="text-sm font-semibold text-slate-600">{step.outcome}</span>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#fff1e7] text-[#d85a2f]">
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
