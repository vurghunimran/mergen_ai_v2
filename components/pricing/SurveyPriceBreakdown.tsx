import { formatUsdCents, type SurveyPricingBreakdown } from "@/lib/survey-pricing";
export default function SurveyPriceBreakdown({ pricing }: { pricing: SurveyPricingBreakdown }) {
  const rows = [
    ["Category", pricing.pricingCategory === "student" ? "Students" : "Institutions & Businesses"],
    ["Selected question allowance", String(pricing.questionCount)],
    ["Requested completed responses", String(pricing.responseCount)],
    ["Setup fee (once per survey)", formatUsdCents(pricing.setupFeeCents)],
    ["Price per completed response", formatUsdCents(pricing.perResponseCents)],
    ["Response subtotal", formatUsdCents(pricing.responseSubtotalCents)],
    ["AI-generated summary (once per survey)", formatUsdCents(pricing.reportFeeCents)]
  ];
  return <div className="space-y-4" aria-live="polite" aria-atomic="true">
    <dl className="space-y-3">{rows.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 text-sm text-[#667085]"><dt>{label}</dt><dd className="font-medium">{value}</dd></div>)}</dl>
    <p className="text-sm text-[#7c3412]">{pricing.reportFeeCents > 0 ? "AI-generated summary: available once the survey finishes." : "AI-generated summary not selected."}</p>
    <div className="flex justify-between gap-4 border-t border-dashed border-gray-200 pt-4 text-lg font-semibold text-[#111827]"><span>Total (USD)</span><span>{formatUsdCents(pricing.totalCents)}</span></div>
    <p className="text-xs text-[#667085]">Before any separately applicable taxes.</p>
  </div>;
}
