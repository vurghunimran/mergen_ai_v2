"use client";
import { useState } from "react";
import { academicQuestionCountOptions, academicRespondentCountOptions, calculateSurveyPricing, type SurveyPricingInput } from "@/lib/survey-pricing";
import SurveyPriceBreakdown from "./SurveyPriceBreakdown";
export default function SurveyPricingCalculator() {
  const [input, setInput] = useState<SurveyPricingInput>({ pricingCategory: "institution", questionCount: 10, responseCount: 100, includeDetailedReport: false });
  const pricing = calculateSurveyPricing(input);
  const control = "mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 text-[#111827]";
  return <div className="grid gap-8 rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-2 sm:p-8">
    <div className="space-y-5">
      <label className="block text-sm">Client pricing category<select className={control} value={input.pricingCategory} onChange={e => setInput({ ...input, pricingCategory: e.target.value as SurveyPricingInput["pricingCategory"] })}><option value="institution">Institutions &amp; Businesses</option><option value="student">Students</option></select></label>
      <label className="block text-sm">Selected question allowance<select className={control} value={input.questionCount} onChange={e => setInput({ ...input, questionCount: Number(e.target.value) as SurveyPricingInput["questionCount"] })}>{academicQuestionCountOptions.map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      <label className="block text-sm">Requested completed responses<select className={control} value={input.responseCount} onChange={e => setInput({ ...input, responseCount: Number(e.target.value) as SurveyPricingInput["responseCount"] })}>{academicRespondentCountOptions.map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={input.includeDetailedReport} onChange={e => setInput({ ...input, includeDetailedReport: e.target.checked })} />AI-generated summary: +$20 once per survey, available after completion</label>
      <p className="text-xs text-[#667085]">Student pricing is checked against your account and existing university-email eligibility at checkout. This calculator is a preview.</p>
    </div>
    <SurveyPriceBreakdown pricing={pricing} />
  </div>;
}
