"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { Gift, Search, X } from "lucide-react";
import { REWARD_CATEGORIES } from "@/lib/reward-categories";
import type { MemberReward, MemberRewardCatalog } from "@/lib/member-reward-catalog";
import CashWithdrawalPanel from "@/components/dashboard/CashWithdrawalPanel";

const normalizeSearch = (value: string) => value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
const categoryLabels = new Map(REWARD_CATEGORIES.map(category => [category.id, category.label]));

function RewardCard({ reward }: { reward: MemberReward }) {
  const [imageFailed, setImageFailed] = useState(false);
  const value = new Intl.NumberFormat("en-US", { style: "currency", currency: reward.currency, currencyDisplay: "code", maximumFractionDigits: 2 }).format(reward.value);
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-[#e6e1f0] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
      <div className="relative flex h-36 items-center justify-center bg-[#f5f2fb] px-6">
        {imageFailed ? (
          <span className="text-4xl font-bold text-[#6d3fd1]" aria-hidden="true">{reward.company.slice(0, 2).toUpperCase()}</span>
        ) : (
          <Image src={reward.imageUrl} alt={`${reward.company} gift card`} width={250} height={150} unoptimized className="max-h-28 w-auto max-w-full rounded-xl object-contain" onError={() => setImageFailed(true)} />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="break-words text-xl font-bold tracking-[-0.03em] text-[#1f2937]">{reward.company}</h3>
        <p className="mt-1 text-xs text-[#64748b]">{categoryLabels.get(reward.category)}</p>
        <p className="mt-3 text-lg font-semibold text-[#334155]">{value}</p>
        {reward.currency !== "USD" ? <p className="mt-1 text-xs text-[#64748b]">$5 USD equivalent</p> : null}
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div><p className="text-xs text-[#64748b]">Required credits</p><p className="mt-1 text-2xl font-bold text-[#4f2a78]">{reward.credits.toLocaleString("en-US")}</p></div>
          <button type="button" disabled className="rounded-full bg-[#f0e9fa] px-4 py-2 text-sm font-semibold text-[#6d3fd1] disabled:cursor-not-allowed">Coming soon</button>
        </div>
      </div>
    </article>
  );
}

export default function RewardsCatalog({ catalog, memberId, availableCredits, onBalanceChange }: {
  catalog: MemberRewardCatalog; memberId: string; availableCredits: number; onBalanceChange: () => Promise<void>;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const query = normalizeSearch(search);
  const rewards = catalog.rewards.filter(reward =>
    (selectedCategory === "all" || selectedCategory === reward.category) &&
    (!query || normalizeSearch(`${reward.company} ${categoryLabels.get(reward.category)} ${reward.currency}`).includes(query)));
  const showCash = (selectedCategory === "all" || selectedCategory === "cash_withdraw") &&
    (!query || normalizeSearch("Cash withdrawal Cash Withdraw Bank transfer Trolley USD").includes(query));
  const count = rewards.length + Number(showCash);
  const filtered = Boolean(search || selectedCategory !== "all");

  return (
    <section aria-label="Reward catalog" className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="min-w-0 flex-1"><label htmlFor={`${id}-search`} className="mb-2 block text-sm font-medium text-[#334155]">Search rewards</label>
          <div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-[#94a3b8]" />
            <input id={`${id}-search`} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search brands or cash" className="w-full rounded-2xl border border-[#ddd5ed] bg-white py-3 pl-12 pr-4 text-base text-[#1f2937] outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#ede4ff]" />
          </div>
        </div>
        <div className="sm:w-72"><label htmlFor={`${id}-category`} className="mb-2 block text-sm font-medium text-[#334155]">Category</label>
          <select id={`${id}-category`} value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)} className="w-full rounded-2xl border border-[#ddd5ed] bg-white px-4 py-3 text-base text-[#1f2937] focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#ede4ff]">
            <option value="all">All categories</option>
            {REWARD_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3"><p aria-live="polite" className="text-sm text-[#64748b]">{count} reward{count === 1 ? "" : "s"}{catalog.country ? ` for ${catalog.country}` : ""}</p>
        {filtered ? <button type="button" onClick={() => { setSearch(""); setSelectedCategory("all"); }} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-[#6d3fd1]"><X className="h-4 w-4" aria-hidden="true" />Clear filters</button> : null}
      </div>
      <div className={count ? "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" : "hidden"}>
        <div className={showCash ? "contents" : "hidden"}>
          <CashWithdrawalPanel memberId={memberId} availableCredits={availableCredits} onBalanceChange={onBalanceChange} />
        </div>
        {rewards.map(reward => <RewardCard key={reward.id} reward={reward} />)}
      </div>
      {!count ? <div className="rounded-3xl border border-dashed border-[#ddd5ed] bg-[#faf7ff] p-8 text-center">
        <Gift className="mx-auto h-8 w-8 text-[#8b5cf6]" aria-hidden="true" />
        <h3 className="mt-3 text-lg font-semibold text-[#334155]">No matching rewards</h3>
        <p className="mt-2 text-sm text-[#64748b]">Try another search or category.</p>
      </div> : null}
      {catalog.rewards.length ? <p className="text-xs leading-5 text-[#64748b]">Currency rates: {catalog.fxDate} · <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer" className="underline">Exchange Rate API</a></p> : null}
    </section>
  );
}
