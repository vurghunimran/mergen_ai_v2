export type RewardActivationStatus = "activated" | "fulfilled" | "cancelled";

export type RewardCatalogItem = {
  id: string;
  company: string;
  mark: string;
  subtitle: string;
  credits: number;
  brandClassName: string;
};

export type RewardActivationRow = {
  id: string;
  member_id: string;
  reward_id: string;
  reward_company: string;
  reward_subtitle: string;
  activation_email: string;
  credits: number;
  status: RewardActivationStatus;
  activated_at: string;
  created_at?: string;
  updated_at?: string;
};

export type RewardActivation = {
  id: string;
  memberId: string;
  rewardId: string;
  rewardCompany: string;
  rewardSubtitle: string;
  activationEmail: string;
  credits: number;
  status: RewardActivationStatus;
  activatedAt: string;
};

export const REWARDS: RewardCatalogItem[] = [
  {
    id: "withdraw-cash",
    company: "Withdraw cash",
    mark: "$",
    subtitle: "Bank transfer payout",
    credits: 900,
    brandClassName: "bg-[#14532d] text-white"
  },
  {
    id: "amazon",
    company: "Amazon",
    mark: "a",
    subtitle: "Gift card",
    credits: 700,
    brandClassName: "bg-[#111827] text-white"
  },
  {
    id: "apple",
    company: "Apple",
    mark: "A",
    subtitle: "Store balance",
    credits: 680,
    brandClassName: "bg-[#f3f4f6] text-[#111827]"
  },
  {
    id: "netflix",
    company: "Netflix",
    mark: "N",
    subtitle: "Subscription reward",
    credits: 520,
    brandClassName: "bg-[#e50914] text-white"
  },
  {
    id: "spotify",
    company: "Spotify",
    mark: "S",
    subtitle: "Music voucher",
    credits: 460,
    brandClassName: "bg-[#1ed760] text-[#111827]"
  },
  {
    id: "uber",
    company: "Uber",
    mark: "U",
    subtitle: "Ride credit",
    credits: 240,
    brandClassName: "bg-[#111827] text-white"
  },
  {
    id: "starbucks",
    company: "Starbucks",
    mark: "S",
    subtitle: "Coffee card",
    credits: 180,
    brandClassName: "bg-[#006241] text-white"
  }
];

const rewardsById = new Map(REWARDS.map((reward) => [reward.id, reward]));

export function getRewardById(rewardId: string) {
  return rewardsById.get(rewardId) ?? null;
}

export function mapRewardActivationRow(row: RewardActivationRow): RewardActivation {
  return {
    id: row.id,
    memberId: row.member_id,
    rewardId: row.reward_id,
    rewardCompany: row.reward_company,
    rewardSubtitle: row.reward_subtitle,
    activationEmail: row.activation_email,
    credits: row.credits,
    status: row.status,
    activatedAt: row.activated_at
  };
}
