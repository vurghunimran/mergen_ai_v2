"use client";

import { ArrowRight } from "lucide-react";

export default function RewardsOverview({ availableCredits, earnedCredits, redeemedCredits, trustScoreLabel, onFindSurveys }: {
  availableCredits: number;
  earnedCredits: number;
  redeemedCredits: number;
  trustScoreLabel: string;
  onFindSurveys: () => void;
}) {
  const format = (value: number) => value.toLocaleString("en-US");

  return <div className="grid overflow-hidden rounded-2xl border border-[#e5e1ea] bg-white lg:grid-cols-[1.8fr_1fr]">
    <div className="p-6 sm:p-8">
      <h2 className="text-sm font-medium text-[#667085]">Available credits</h2>
      <p className="mt-3 text-5xl font-semibold tracking-tight text-[#4f2a78] tabular-nums">{format(availableCredits)}</p>
      <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-4 border-t border-[#eeebf2] pt-5 text-sm">
        <div><dt className="text-[#667085]">Total earned</dt><dd className="mt-1 text-lg font-medium text-[#344054] tabular-nums">{format(earnedCredits)}</dd></div>
        <div><dt className="text-[#667085]">Redeemed</dt><dd className="mt-1 text-lg font-medium text-[#344054] tabular-nums">{format(redeemedCredits)}</dd></div>
      </dl>
    </div>

    <div className="flex flex-col items-start border-t border-[#eeebf2] bg-[#faf9fc] p-6 sm:p-8 lg:border-l lg:border-t-0">
      <h2 className="text-sm font-medium text-[#667085]">Trust score</h2>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[#344054] tabular-nums">{trustScoreLabel}</p>
      <p className="mt-3 max-w-xs text-sm leading-6 text-[#667085]">Based on the quality of your survey answers.</p>
      <button type="button" onClick={onFindSurveys} className="mt-5 inline-flex items-center gap-2 rounded-md py-1 text-sm font-medium text-[#5d338d] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6d3fd1]">Browse surveys <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
    </div>
  </div>;
}
