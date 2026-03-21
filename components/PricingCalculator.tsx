"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

// Base formula constants
const PRICE_PER_QUESTION = 2; // USD per question
const PRICE_PER_RESPONDENT = 0.5; // USD per respondent
const AI_REPORT_PRICE = 29; // USD flat fee

export default function PricingCalculator() {
  const [questions, setQuestions] = useState(10);
  const [respondents, setRespondents] = useState(200);
  const [includeReport, setIncludeReport] = useState(true);

  const pricing = useMemo(() => {
    const questionsCost = questions * PRICE_PER_QUESTION;
    const respondentsCost = respondents * PRICE_PER_RESPONDENT;
    const reportCost = includeReport ? AI_REPORT_PRICE : 0;
    const total = questionsCost + respondentsCost + reportCost;

    return { questionsCost, respondentsCost, reportCost, total };
  }, [questions, respondents, includeReport]);

  return (
    <section id="pricing" className="bg-[var(--sand)] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange sm:text-sm">TRANSPARENT PRICING</p>
        <h2 className="mt-4 font-heading text-3xl font-extrabold text-navy sm:text-5xl">Pay Only For What You Need</h2>

        <div className="mt-10 rounded-3xl border border-orange/25 bg-white/85 p-6 shadow-lg sm:p-8">
          <div className="space-y-8">
            <div>
              <div className="mb-2 flex items-center justify-between text-navy">
                <label htmlFor="questions" className="text-sm font-medium">
                  Number of Questions
                </label>
                <span className="text-sm text-orange">{questions}</span>
              </div>
              <input
                id="questions"
                type="range"
                min={5}
                max={25}
                value={questions}
                onChange={(event) => setQuestions(Number(event.target.value))}
                className="range-orange"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-navy">
                <label htmlFor="respondents" className="text-sm font-medium">
                  Number of Respondents
                </label>
                <span className="text-sm text-orange">{respondents}</span>
              </div>
              <input
                id="respondents"
                type="range"
                min={50}
                max={1000}
                step={10}
                value={respondents}
                onChange={(event) => setRespondents(Number(event.target.value))}
                className="range-orange"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-orange/20 bg-orange/5 px-4 py-3">
              <p className="text-sm text-navy">Include AI Report?</p>
              <button
                type="button"
                onClick={() => setIncludeReport((prev) => !prev)}
                className={`relative h-8 w-14 rounded-full transition ${
                  includeReport ? "bg-orange" : "bg-navy/20"
                }`}
                aria-pressed={includeReport}
                aria-label="Toggle AI report"
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
                    includeReport ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="rounded-xl border border-orange/25 bg-[var(--sand)] p-5 text-navy">
              <p className="text-sm text-navy/80">
                ${pricing.questionsCost.toFixed(2)} (Questions) + ${pricing.respondentsCost.toFixed(2)} (Respondents) + $
                {pricing.reportCost.toFixed(2)} (AI Report)
              </p>
              <p className="mt-3 font-heading text-4xl font-extrabold text-orange">${pricing.total.toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact?purpose=business"
              className="rounded-full border border-orange px-5 py-3 text-sm font-semibold text-orange transition hover:bg-orange hover:text-white"
            >
              Business Inquiries
            </Link>
            <Link
              href="/contact?purpose=university"
              className="rounded-full border border-orange px-5 py-3 text-sm font-semibold text-orange transition hover:bg-orange hover:text-white"
            >
              University Partnerships
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
