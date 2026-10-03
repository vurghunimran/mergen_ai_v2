import catalog from "@/lib/data/curated-rewards.json";
import { getCommunityRewardCountry } from "@/lib/community-reward-countries";
import type { RewardCategoryId } from "@/lib/reward-categories";

export type MemberReward = {
  id: string;
  productId: string;
  company: string;
  category: Exclude<RewardCategoryId, "cash_withdraw">;
  imageUrl: string;
  value: number;
  currency: string;
  usdValue: number;
  credits: number;
};

export type MemberRewardCatalog = {
  country: string | null;
  countryCode: string | null;
  catalogDate: string;
  fxDate: string;
  minimumGiftCredits: number;
  giftUsdValue: number;
  rewards: MemberReward[];
};

// The public snapshot is for browsing only. It cannot authorize fulfillment or debit credits.
// Send only this member's country and card fields to the browser, never the full global catalog.
export function getMemberRewardCatalog(countryName: string): MemberRewardCatalog {
  const country = getCommunityRewardCountry(countryName);
  const entry = country ? catalog.countries.find(item => item.code === country.code) : undefined;
  return {
    country: country?.name ?? null,
    countryCode: country?.code ?? null,
    catalogDate: catalog.catalogDate,
    fxDate: catalog.fxDate,
    minimumGiftCredits: catalog.minimumGiftCredits,
    giftUsdValue: catalog.giftUsdValue,
    rewards: (entry?.rewards ?? []).map(reward => ({
      id: reward.id,
      productId: reward.productId,
      company: reward.company,
      category: reward.category as MemberReward["category"],
      imageUrl: reward.imageUrl,
      value: reward.value,
      currency: reward.currency,
      usdValue: reward.usdValue,
      credits: reward.credits
    }))
  };
}
