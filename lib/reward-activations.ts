export type RewardActivationStatus = "activated" | "fulfilled" | "cancelled";

export type RewardCategoryId =
  | "cash_withdraw"
  | "productivity_and_research_tools"
  | "streaming_and_digital_services"
  | "tech_and_software"
  | "lifestyle_and_everyday_brands"
  | "education_and_learning_platforms"
  | "gaming_companies";

export type RewardCategory = {
  id: RewardCategoryId;
  label: string;
};

export type RewardCatalogItem = {
  id: string;
  category: RewardCategoryId;
  company: string;
  subtitle: string;
  credits: number;
  mark?: string;
  logoSrc?: string;
  logoAlt?: string;
  logoBackgroundClassName?: string;
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

export const REWARD_CATEGORIES: RewardCategory[] = [
  {
    id: "cash_withdraw",
    label: "Cash Withdraw"
  },
  {
    id: "productivity_and_research_tools",
    label: "Productivity & Research Tools"
  },
  {
    id: "streaming_and_digital_services",
    label: "Streaming & Digital Services"
  },
  {
    id: "tech_and_software",
    label: "Tech & Software"
  },
  {
    id: "lifestyle_and_everyday_brands",
    label: "Lifestyle & Everyday Brands"
  },
  {
    id: "education_and_learning_platforms",
    label: "Education & Learning Platforms"
  },
  {
    id: "gaming_companies",
    label: "Gaming Companies"
  }
] as const;

export const REWARDS: RewardCatalogItem[] = [
  {
    id: "withdraw-cash",
    category: "cash_withdraw",
    company: "Cash Withdraw",
    mark: "$",
    subtitle: "Bank transfer payout",
    credits: 920,
    logoBackgroundClassName: "bg-[linear-gradient(135deg,#14532d_0%,#15803d_100%)] text-white"
  },
  {
    id: "notion",
    category: "productivity_and_research_tools",
    company: "Notion",
    subtitle: "Workspace credit",
    credits: 560,
    logoSrc: "https://logo.clearbit.com/notion.so",
    logoAlt: "Notion logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "grammarly",
    category: "productivity_and_research_tools",
    company: "Grammarly",
    subtitle: "Premium writing tools",
    credits: 580,
    logoSrc: "https://logo.clearbit.com/grammarly.com",
    logoAlt: "Grammarly logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "canva",
    category: "productivity_and_research_tools",
    company: "Canva",
    subtitle: "Design subscription credit",
    credits: 600,
    logoSrc: "https://logo.clearbit.com/canva.com",
    logoAlt: "Canva logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "google",
    category: "productivity_and_research_tools",
    company: "Google",
    subtitle: "Google One, Workspace discounts",
    credits: 650,
    logoSrc: "https://logo.clearbit.com/google.com",
    logoAlt: "Google logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "spotify",
    category: "streaming_and_digital_services",
    company: "Spotify",
    subtitle: "Premium music reward",
    credits: 620,
    logoSrc: "https://logo.clearbit.com/spotify.com",
    logoAlt: "Spotify logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "netflix",
    category: "streaming_and_digital_services",
    company: "Netflix",
    subtitle: "Streaming subscription reward",
    credits: 670,
    logoSrc: "https://logo.clearbit.com/netflix.com",
    logoAlt: "Netflix logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "youtube-premium",
    category: "streaming_and_digital_services",
    company: "YouTube",
    subtitle: "YouTube Premium reward",
    credits: 610,
    logoSrc: "https://logo.clearbit.com/youtube.com",
    logoAlt: "YouTube logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "amazon",
    category: "streaming_and_digital_services",
    company: "Amazon",
    subtitle: "Gift cards",
    credits: 700,
    logoSrc: "https://logo.clearbit.com/amazon.com",
    logoAlt: "Amazon logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "microsoft",
    category: "tech_and_software",
    company: "Microsoft",
    subtitle: "Software and account credits",
    credits: 720,
    logoSrc: "https://logo.clearbit.com/microsoft.com",
    logoAlt: "Microsoft logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "adobe",
    category: "tech_and_software",
    company: "Adobe",
    subtitle: "Creative Cloud reward",
    credits: 740,
    logoSrc: "https://logo.clearbit.com/adobe.com",
    logoAlt: "Adobe logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "figma",
    category: "tech_and_software",
    company: "Figma",
    subtitle: "Design collaboration credit",
    credits: 690,
    logoSrc: "https://logo.clearbit.com/figma.com",
    logoAlt: "Figma logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "zoom",
    category: "tech_and_software",
    company: "Zoom",
    subtitle: "Meeting and productivity credit",
    credits: 730,
    logoSrc: "https://logo.clearbit.com/zoom.us",
    logoAlt: "Zoom logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "openai-chatgpt",
    category: "tech_and_software",
    company: "OpenAI",
    subtitle: "ChatGPT reward",
    credits: 750,
    logoSrc: "https://logo.clearbit.com/openai.com",
    logoAlt: "OpenAI logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "anthropic-claude",
    category: "tech_and_software",
    company: "Anthropic",
    subtitle: "Claude reward",
    credits: 800,
    logoSrc: "https://logo.clearbit.com/anthropic.com",
    logoAlt: "Anthropic logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "starbucks",
    category: "lifestyle_and_everyday_brands",
    company: "Starbucks",
    subtitle: "Coffee and drinks card",
    credits: 620,
    logoSrc: "https://logo.clearbit.com/starbucks.com",
    logoAlt: "Starbucks logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "uber",
    category: "lifestyle_and_everyday_brands",
    company: "Uber",
    subtitle: "Ride and delivery credit",
    credits: 730,
    logoSrc: "https://logo.clearbit.com/uber.com",
    logoAlt: "Uber logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "airbnb",
    category: "lifestyle_and_everyday_brands",
    company: "Airbnb",
    subtitle: "Travel stay reward",
    credits: 830,
    logoSrc: "https://logo.clearbit.com/airbnb.com",
    logoAlt: "Airbnb logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "booking-com",
    category: "lifestyle_and_everyday_brands",
    company: "Booking.com",
    subtitle: "Travel booking reward",
    credits: 870,
    logoSrc: "https://logo.clearbit.com/booking.com",
    logoAlt: "Booking.com logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "coursera",
    category: "education_and_learning_platforms",
    company: "Coursera",
    subtitle: "Course access reward",
    credits: 730,
    logoSrc: "https://logo.clearbit.com/coursera.org",
    logoAlt: "Coursera logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "udemy",
    category: "education_and_learning_platforms",
    company: "Udemy",
    subtitle: "Learning credit",
    credits: 700,
    logoSrc: "https://logo.clearbit.com/udemy.com",
    logoAlt: "Udemy logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "duolingo",
    category: "education_and_learning_platforms",
    company: "Duolingo",
    subtitle: "Language learning reward",
    credits: 720,
    logoSrc: "https://logo.clearbit.com/duolingo.com",
    logoAlt: "Duolingo logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "steam",
    category: "gaming_companies",
    company: "Steam",
    subtitle: "Game wallet credit",
    credits: 780,
    logoSrc: "https://logo.clearbit.com/steampowered.com",
    logoAlt: "Steam logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "playstation",
    category: "gaming_companies",
    company: "PlayStation",
    subtitle: "Store reward",
    credits: 890,
    logoSrc: "https://logo.clearbit.com/playstation.com",
    logoAlt: "PlayStation logo",
    logoBackgroundClassName: "bg-white"
  },
  {
    id: "epic-games",
    category: "gaming_companies",
    company: "Epic Games",
    subtitle: "Game store reward",
    credits: 860,
    logoSrc: "https://logo.clearbit.com/epicgames.com",
    logoAlt: "Epic Games logo",
    logoBackgroundClassName: "bg-white"
  }
];

const rewardsById = new Map(REWARDS.map((reward) => [reward.id, reward]));

export function getRewardById(rewardId: string) {
  return rewardsById.get(rewardId) ?? null;
}

export function getRewardsByCategory(categoryId: RewardCategoryId) {
  return REWARDS.filter((reward) => reward.category === categoryId);
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
