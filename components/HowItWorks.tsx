import { BarChart3, Bot, Filter, PenSquare } from "lucide-react";

const steps = [
  {
    icon: PenSquare,
    title: "Write your goal",
    description: "Describe the topic, target group, and the decision you want the research to support."
  },
  {
    icon: Bot,
    title: "Let AI build the draft",
    description: "Mergen turns your brief into a survey structure and initial question set."
  },
  {
    icon: Filter,
    title: "Choose the audience",
    description: "Filter by region, education, age, profession, and other matching criteria."
  },
  {
    icon: BarChart3,
    title: "Review the results",
    description: "Get structured outputs, signal summaries, and next-step insight recommendations."
  }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full border border-[#d85a2f]/20 bg-[#fff0e5] px-4 py-2 text-sm font-semibold text-[#d85a2f]">
            How it works
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-[-0.04em] text-slate-900 sm:text-4xl">
            A horizontal process flow from idea to insight.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            The workflow is simple on purpose: start with a prompt, let AI shape the survey, choose the audience, and
            turn results into something useful.
          </p>
        </div>

        <div className="relative mt-12">
          <div className="absolute left-0 right-0 top-16 hidden h-px border-t-2 border-dashed border-[#d85a2f]/35 lg:block" />

          <div className="grid gap-5 lg:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <article
                  key={step.title}
                  className="relative rounded-[30px] border border-white/70 bg-white/80 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur"
                >
                  <span className="absolute right-5 top-5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#fff1e7] text-xs font-bold text-[#d85a2f]">
                    {index + 1}
                  </span>

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff4ea] text-[#d85a2f]">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="mt-6 text-xl font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
