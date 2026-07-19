"use client";

import { useId, useState, type KeyboardEvent } from "react";
import {
  Bot,
  ClipboardCheck,
  ChevronRight,
  FileText,
  Gift,
  PenSquare,
  ShieldCheck,
  Sparkles,
  Target,
  UserPlus,
} from "lucide-react";

const flowSteps = {
  client: [
    {
      icon: Target,
      title: "Define Your Audience",
      description: "Choose the demographics, interests, and criteria that match your research."
    },
    {
      icon: PenSquare,
      title: "Set Your Research Goal",
      description: "Tell Mergen what you want to learn and which decision the research should support."
    },
    {
      icon: Bot,
      title: "Create with AI",
      description: "Let AI turn your research goal into a focused, ready-to-launch survey."
    },
    {
      icon: FileText,
      title: "Get Clear Insights",
      description: "Review structured results, key findings, and decision-ready reports."
    }
  ],
  audience: [
    {
      icon: UserPlus,
      title: "Create Your Profile",
      description: "Sign up and share information that helps match you with relevant surveys."
    },
    {
      icon: ClipboardCheck,
      title: "Complete Surveys",
      description: "Answer surveys carefully and provide detailed, thoughtful responses."
    },
    {
      icon: ShieldCheck,
      title: "Build Your Trust Score",
      description: "Improve your score and unlock more opportunities through consistent, high-quality participation."
    },
    {
      icon: Gift,
      title: "Unlock Rewards",
      description: "Redeem exclusive perks and discounts from trusted brands."
    }
  ]
} as const;

type FlowKey = keyof typeof flowSteps;

const flowOptions: { key: FlowKey; label: string }[] = [
  { key: "client", label: "Client Flow" },
  { key: "audience", label: "Audience Flow" }
];

export default function HowItWorks() {
  const [activeFlow, setActiveFlow] = useState<FlowKey>("client");
  const tabIdPrefix = useId();
  const activeSteps = flowSteps[activeFlow];

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentKey: FlowKey) {
    const currentIndex = flowOptions.findIndex((option) => option.key === currentKey);
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % flowOptions.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + flowOptions.length) % flowOptions.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = flowOptions.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextKey = flowOptions[nextIndex].key;
    setActiveFlow(nextKey);
    requestAnimationFrame(() => {
      document.getElementById(`${tabIdPrefix}-${nextKey}-tab`)?.focus();
    });
  }

  return (
    <section id="how-it-works" className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[40px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,248,239,0.78)_0%,rgba(255,239,219,0.72)_42%,rgba(255,232,204,0.76)_100%)] px-5 py-14 shadow-[0_26px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:px-8 lg:px-12 lg:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,255,255,0.62),transparent_20%),radial-gradient(circle_at_82%_24%,rgba(255,183,114,0.28),transparent_24%),radial-gradient(circle_at_50%_78%,rgba(216,90,47,0.12),transparent_20%)]" />
          <div className="absolute left-[-5%] top-12 h-52 w-52 rounded-full bg-white/35 blur-3xl" />
          <div className="absolute right-[-6%] top-20 h-64 w-64 rounded-full bg-[#f1a35f]/22 blur-3xl" />

          <div className="relative z-10">
            <div className="mx-auto max-w-4xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d85a2f]/15 bg-white/75 px-4 py-2 text-sm font-semibold text-[#d85a2f] shadow-[0_12px_24px_rgba(216,90,47,0.08)]">
                <Sparkles className="h-4 w-4" />
                How it works
              </span>
              <h2 className="mt-6 text-3xl font-extrabold text-transparent sm:text-4xl lg:text-5xl">
                <span className="bg-[linear-gradient(90deg,#d85a2f_0%,#ef6b39_50%,#ff9c4d_100%)] bg-clip-text">
                  Choose Your Path with Mergen.
                </span>
              </h2>

              <div
                role="tablist"
                aria-label="Choose a Mergen workflow"
                aria-orientation="horizontal"
                className="mx-auto mt-7 inline-flex overflow-hidden rounded-full border border-[#f1d6c4] bg-white/70 p-1 shadow-[0_16px_34px_rgba(15,23,42,0.06)] backdrop-blur"
              >
                {flowOptions.map((option, optionIndex) => {
                  const isSelected = activeFlow === option.key;
                  const tabId = `${tabIdPrefix}-${option.key}-tab`;
                  const panelId = `${tabIdPrefix}-${option.key}-panel`;
                  const cornerClass = optionIndex === 0 ? "rounded-l-full" : "rounded-r-full";

                  return (
                    <button
                      key={option.key}
                      id={tabId}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      aria-controls={panelId}
                      tabIndex={isSelected ? 0 : -1}
                      onClick={() => setActiveFlow(option.key)}
                      onKeyDown={(event) => handleTabKeyDown(event, option.key)}
                      className={`inline-flex min-w-[7.75rem] items-center justify-center border px-4 py-2.5 text-sm font-bold outline-none transition-all duration-200 motion-reduce:transition-none sm:min-w-[9rem] sm:px-6 ${cornerClass} ${
                        isSelected
                          ? "border-transparent bg-[linear-gradient(135deg,#d85a2f_0%,#ef6b39_100%)] text-white shadow-[0_12px_24px_rgba(216,90,47,0.22)]"
                          : "border-[#f1d6c4]/70 bg-white/75 text-[#d85a2f] hover:bg-[#fff4ec] hover:text-[#bf4c25]"
                      } focus-visible:ring-2 focus-visible:ring-[#d85a2f]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fff6ee]`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative mt-10 overflow-hidden rounded-[34px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,248,240,0.88)_0%,rgba(255,241,226,0.92)_100%)] p-6 shadow-[0_22px_55px_rgba(15,23,42,0.06)] sm:p-7 lg:mt-14 lg:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(255,255,255,0.55),transparent_18%),radial-gradient(circle_at_84%_18%,rgba(255,255,255,0.26),transparent_20%)]" />

              <div className="relative z-10 min-h-[74rem] md:min-h-[38rem] xl:min-h-[23rem]">
                <div className="hidden h-px w-full bg-gradient-to-r from-[#ef8b45]/70 via-[#d85a2f]/80 to-[#f5b06a]/70 xl:block" />

                <div
                  key={activeFlow}
                  id={`${tabIdPrefix}-${activeFlow}-panel`}
                  role="tabpanel"
                  aria-labelledby={`${tabIdPrefix}-${activeFlow}-tab`}
                  className="motion-safe:animate-[fade-up_240ms_ease-out] motion-reduce:animate-none"
                >
                  <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4 xl:gap-8">
                    {activeSteps.map((step, index) => {
                      const Icon = step.icon;

                      return (
                        <article
                          key={step.title}
                          className="relative flex h-full min-h-[17rem] flex-col rounded-[28px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(255,250,245,0.95)_100%)] p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)]"
                        >
                          <div className="absolute inset-x-0 top-0 h-1 rounded-t-[28px] bg-gradient-to-r from-[#d85a2f] to-[#ffb06d]" />

                          {index < activeSteps.length - 1 ? (
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

                          <h4 className="mt-5 text-xl font-bold leading-tight text-slate-900">
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
      </div>
    </section>
  );
}
