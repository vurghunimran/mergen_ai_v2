"use client";

import { useEffect, useState } from "react";
import { Bot, Sparkles } from "lucide-react";

const promptText = "I want to gather data about student's preferences regarding online education in Asia";

const surveyQuestions = [
  "Which type of online education format do you prefer most?",
  "What is the main reason you choose online education over in-person classes?",
  "Which device do you use most often for online learning?",
  "What makes you trust an online education platform enough to keep using it?"
];

export default function AISection() {
  const [activeQuestion, setActiveQuestion] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveQuestion((current) => (current + 1) % surveyQuestions.length);
    }, 2400);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section id="ai-workflow" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[36px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)] backdrop-blur sm:p-8 lg:p-10">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d85a2f]/20 bg-[#fff0e5] px-4 py-2 text-sm font-semibold text-[#d85a2f]">
            <Sparkles className="h-4 w-4" />
            AI in the workflow
          </span>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:items-stretch">
          <div className="rounded-[30px] border border-[#d85a2f]/15 bg-[#fff8f3] p-6">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#d85a2f] shadow-sm">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">AI Chatbot</p>
                <p className="text-sm text-slate-500">Prompt input</p>
              </div>
            </div>

            <div className="mt-6 rounded-[26px] border border-[#d85a2f]/15 bg-white p-5 shadow-sm">
              <div className="rounded-[22px] border border-slate-100 bg-[#fbfbfb] px-5 py-5 text-left text-base leading-8 text-slate-700">
                {promptText}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className="rounded-2xl bg-[#d85a2f] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(216,90,47,0.18)]"
                >
                  Generate survey
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f5_100%)] p-5">
            <div className="flex h-full flex-col rounded-[26px] border border-white bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Survey questions</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">Generated one by one</p>
                </div>
                <span className="rounded-full bg-[#edf7f6] px-3 py-1 text-xs font-semibold text-[#3f8e92]">
                  {activeQuestion + 1} / {surveyQuestions.length}
                </span>
              </div>

              <div className="relative mt-8 flex min-h-[220px] items-center justify-center overflow-hidden rounded-[28px] border border-[#d85a2f]/15 bg-[#fff8f3] px-6 py-10">
                {surveyQuestions.map((question, index) => (
                  <div
                    key={question}
                    className={`absolute inset-0 flex items-center justify-center px-6 text-center text-[clamp(1.35rem,2.4vw,2rem)] font-semibold leading-[1.45] text-slate-900 transition-all duration-500 ${
                      index === activeQuestion
                        ? "translate-y-0 opacity-100"
                        : "pointer-events-none translate-y-6 opacity-0"
                    }`}
                  >
                    {question}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-center gap-2">
                {surveyQuestions.map((question, index) => (
                  <span
                    key={question}
                    className={`h-2.5 rounded-full transition-all ${
                      index === activeQuestion ? "w-8 bg-[#d85a2f]" : "w-2.5 bg-[#e4d8ca]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
