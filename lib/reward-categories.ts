export type RewardCategoryId =
  | "cash_withdraw"
  | "productivity_and_research_tools"
  | "streaming_and_digital_services"
  | "tech_and_software"
  | "lifestyle_and_everyday_brands"
  | "education_and_learning_platforms"
  | "gaming_companies";

export type RewardCategory = { id: RewardCategoryId; label: string };

export const REWARD_CATEGORIES: RewardCategory[] = [
  { id: "cash_withdraw", label: "Cash Withdraw" },
  { id: "productivity_and_research_tools", label: "Productivity & Research Tools" },
  { id: "streaming_and_digital_services", label: "Streaming & Digital Services" },
  { id: "tech_and_software", label: "Tech & Software" },
  { id: "lifestyle_and_everyday_brands", label: "Lifestyle & Everyday Brands" },
  { id: "education_and_learning_platforms", label: "Education & Learning Platforms" },
  { id: "gaming_companies", label: "Gaming Companies" }
];
