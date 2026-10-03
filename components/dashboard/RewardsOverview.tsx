"use client";

import { ArrowRight, Gift, Shield, Sparkles, Wallet } from "lucide-react";

export default function RewardsOverview({ availableCredits, earnedCredits, redeemedCredits, trustScoreLabel, giftCreditGoal, onFindSurveys }: {
  availableCredits: number;
  earnedCredits: number;
  redeemedCredits: number;
  trustScoreLabel: string;
  giftCreditGoal: number | null;
  onFindSurveys: () => void;
}) {
  const goal = giftCreditGoal !== null && giftCreditGoal > 0 ? giftCreditGoal : null;
  const progress = goal ? Math.min(100, Math.max(0, availableCredits / goal * 100)) : 0;
  const remaining = goal ? Math.max(0, goal - availableCredits) : 0;
  const format = (value: number) => value.toLocaleString("en-US");

  return <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4f2a78] via-[#63349a] to-[#7b49ba] p-6 text-white sm:p-8 lg:col-span-2">
        <Gift className="pointer-events-none absolute -right-4 top-4 h-44 w-44 -rotate-12 text-white" style={{ opacity: 0.08 }} strokeWidth={1} aria-hidden="true" />
        <div className="relative">
          <p className="flex items-center gap-2 text-sm font-medium text-purple-100"><Wallet className="h-4 w-4" aria-hidden="true" /> Your credit balance</p>
          <p className="mt-4 text-5xl font-bold tracking-[-0.04em] tabular-nums sm:text-6xl">{format(availableCredits)}</p>
          <p className="mt-2 text-sm text-purple-100">Credits available for rewards</p>
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/20 pt-4 text-sm">
            <div><dt className="text-purple-200">Total earned</dt><dd className="mt-1 font-semibold tabular-nums">{format(earnedCredits)}</dd></div>
            <div><dt className="text-purple-200">Already redeemed</dt><dd className="mt-1 font-semibold tabular-nums">{format(redeemedCredits)}</dd></div>
          </dl>
        </div>
      </div>

      <div className="flex flex-col rounded-[28px] border border-[#e9e1f2] bg-white p-6 sm:p-8">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f1ebfa] text-[#6d3fd1]"><Shield className="h-5 w-5" aria-hidden="true" /></span>
        <h2 className="mt-4 text-sm font-medium text-[#64748b]">Your trust score</h2>
        <p className="mt-2 text-4xl font-bold tracking-tight text-[#4f2a78] tabular-nums">{trustScoreLabel}</p>
        <p className="mt-3 text-sm leading-6 text-[#64748b]">Reflects the quality of your survey responses. Clear, thoughtful answers help.</p>
        <button type="button" onClick={onFindSurveys} className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[#f1ebfa] px-4 py-3 text-sm font-semibold text-[#5d338d] transition hover:bg-[#e9ddf8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d3fd1]">Find surveys <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
      </div>
    </div>

    <div className="rounded-2xl border border-[#e9e1f2] bg-[#faf7ff] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#8a56cb]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-[#4f2a78]">{goal ? remaining > 0 ? "Your next gift card goal" : "Gift card goal reached" : "Your rewards journey"}</h2>
            {goal ? <span className="text-sm font-medium text-[#64748b] tabular-nums">{format(availableCredits)} / {format(goal)} credits</span> : null}
          </div>
          {goal ? <div role="progressbar" aria-label="Progress toward the lowest credit cost in your gift card catalog" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} className="mt-3 h-2 overflow-hidden rounded-full bg-[#e9ddf8]"><div className="h-full rounded-full bg-[#8a56cb]" style={{ width: `${progress}%` }} /></div> : null}
          <p className="mt-3 text-sm leading-6 text-[#64748b]">{goal ? remaining > 0 ? `${format(remaining)} more credits to reach the lowest gift card cost in your catalog. ` : "You have enough credits for a gift card listed below. " : "Complete surveys to grow your balance. "}Gift card redemption is coming soon.</p>
        </div>
      </div>
    </div>
  </div>;
}
