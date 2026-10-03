import { formatUsdCents, type SurveyPricingBreakdown } from "@/lib/survey-pricing";

export default function SurveyPriceBreakdown({ pricing, showSelections = true }: { pricing: SurveyPricingBreakdown; showSelections?: boolean }) {
  const rows = [
    ...(showSelections ? [
      ["Category", pricing.pricingCategory === "student" ? "Students" : "Institutions & Businesses"],
      ["Question limit", String(pricing.questionCount)]
    ] : []),
    ["Setup fee", formatUsdCents(pricing.setupFeeCents)],
    [`${pricing.responseCount} responses × ${formatUsdCents(pricing.perResponseCents)}`, formatUsdCents(pricing.responseSubtotalCents)],
    ...(pricing.reportFeeCents > 0 ? [["AI summary", formatUsdCents(pricing.reportFeeCents)]] : [])
  ];

  return <div className="space-y-4" aria-live="polite" aria-atomic="true">
    <dl className="space-y-3">{rows.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 text-sm text-[#667085]"><dt className="min-w-0">{label}</dt><dd className="shrink-0 font-medium tabular-nums">{value}</dd></div>)}</dl>
    {pricing.reportFeeCents > 0 ? <p className="text-xs text-[#667085]">AI summary available after the survey ends.</p> : null}
    <div className="flex justify-between gap-4 border-t border-dashed border-gray-200 pt-4 text-lg font-semibold text-[#111827]"><span>Total (USD)</span><span className="shrink-0 tabular-nums">{formatUsdCents(pricing.totalCents)}</span></div>
    <p className="text-xs text-[#667085]">Taxes may apply.</p>
  </div>;
}
