"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Gift,
  Home,
  Info,
  Lock,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  Send,
  type LucideIcon,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  User,
  Wallet,
  X
} from "lucide-react";
import ImageWithFallback from "@/components/dashboard/ImageWithFallback";
import ProfileAvatarPicker from "@/components/dashboard/ProfileAvatarPicker";
import SiteLogo from "@/components/SiteLogo";
import PasswordInput from "@/components/ui/password-input";
import { buildCommunityAudienceProfile, matchesSurveyAudience } from "@/lib/audience-matching";
import { isLikelyInternationalPhoneNumber } from "@/lib/phone-number";
import { AVATAR_METADATA_KEYS, getDefaultAvatarSrc, resolveAvatarSrc } from "@/lib/profile-avatars";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { buildPersistedProfilePayload, upsertProfileRecords } from "@/lib/supabase/profile-db";
import type { UserProfile } from "@/lib/supabase/types";
import {
  getCommunityDashboardAnnouncementStorageKey,
  type CommunityCompletion,
  type CommunityProgress,
  getCommunityDashboardProgressStorageKey,
  getCommunityDashboardSettingsStorageKey,
  type ClientSurvey,
  type SurveyAnswerValue,
  type StoredSurveyQuestion,
  type SurveyAnswerMap,
  type SurveyTrustEvaluationRequest,
  type SurveyTrustEvaluationResponse
} from "@/lib/dashboard-data";
import {
  MAX_TRUST_CREDITS,
  MIN_TRUST_CREDITS,
  buildFallbackTrustEvaluation,
  buildSurveySubmissionAnswers
} from "@/lib/trust-score";
import {
  buildAudienceForDistributionStage,
  normalizeSurveyDistributionStage
} from "@/lib/survey-rollout";
import {
  REWARD_CATEGORIES,
  REWARDS,
  type RewardActivation,
  type RewardCatalogItem
} from "@/lib/reward-activations";
import { WELCOME_SURVEY_CREDITS } from "@/lib/welcome-survey";

const navigationItems = [
  { icon: Home, label: "Dashboard", section: "dashboard" },
  { icon: Wallet, label: "Earnings", section: "earnings" },
  { icon: Gift, label: "Rewards", section: "rewards" },
  { icon: Settings, label: "Settings", section: "settings" }
] as const;

const COMMUNITY_ONBOARDING_ANNOUNCEMENT =
  "We're working on onboarding our community while we finalize our documentation. Client surveys will be visible starting June 1st. Stay tuned and be among the first to participate!";

type DashboardSection = "dashboard" | "earnings" | "rewards" | "settings" | "take-survey";

type CommunitySettings = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  appearance: "light" | "dark";
  twoFactorEnabled: boolean;
  avatarMode: UserProfile["avatarMode"];
  avatarPreset: string;
  avatarCustomDataUrl: string;
};

type TelegramLinkStatus = {
  linked: boolean;
  phoneNumber: string;
  phoneAvailable: boolean;
  phoneReady: boolean;
  phoneMismatch: boolean;
  botConfigured: boolean;
  botConfigurationError: string | null;
  botUsername: string | null;
  notificationsEnabled: boolean;
  telegramUsername: string | null;
  linkedAt: string | null;
};

function buildInitialSettings(profile: UserProfile): CommunitySettings {
  return {
    firstName: profile.firstName || "Maya",
    lastName: profile.lastName || "Chen",
    email: profile.email,
    phone: profile.phoneNumber,
    appearance: profile.appearance,
    twoFactorEnabled: profile.twoFactorEnabled,
    avatarMode: profile.avatarMode,
    avatarPreset: profile.avatarPreset,
    avatarCustomDataUrl: profile.avatarCustomDataUrl
  };
}

function formatTelegramLinkedAt(value: string | null) {
  if (!value) {
    return "";
  }

  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(timestamp);
}

function buildMemberProfile(profile: UserProfile) {
  return buildCommunityAudienceProfile({
    ageSpan: profile.ageSpan,
    country: profile.country,
    gender: profile.gender,
    education: profile.educationalLevel,
    interests: profile.interests,
    salaryRange: profile.salaryRange,
    residence: profile.placeOfResidence,
    familyStatus: profile.familyStatus
  });
}

function getSettingsErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const normalizedMessage = error.message.toLowerCase();

    if (normalizedMessage.includes("profiles")) {
      return "Supabase profile storage is not ready yet. Run the SQL in supabase/schema.sql.";
    }

    if (normalizedMessage.includes("email not confirmed")) {
      return "Check your email inbox to confirm the email change.";
    }

    return error.message;
  }

  return "Could not save your changes. Please try again.";
}

function estimateSurveyCredits(survey: ClientSurvey) {
  if (survey.kind === "welcome") {
    return String(survey.fixedCredits ?? WELCOME_SURVEY_CREDITS);
  }

  return `${MIN_TRUST_CREDITS}-${MAX_TRUST_CREDITS}`;
}

function getSurveyRewardNote(survey: ClientSurvey) {
  if (survey.kind === "welcome") {
    return "Guaranteed after you complete the welcome survey.";
  }

  return "Final credits depend on your trust score after submission.";
}

function getCompletionScoreLabel(completion: CommunityCompletion) {
  if (completion.kind === "welcome" || completion.score === null) {
    return "Welcome bonus";
  }

  return `${completion.score}/100`;
}

function buildRewardLogoFallbackDataUri(reward: RewardCatalogItem) {
  const label = encodeURIComponent((reward.mark || reward.company.charAt(0) || "?").slice(0, 2));
  const backgroundColor = reward.id === "withdraw-cash" ? "14532d" : "111827";
  const textColor = "ffffff";

  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='112' height='112' viewBox='0 0 112 112'><rect width='112' height='112' rx='24' fill='%23${backgroundColor}'/><text x='56' y='64' text-anchor='middle' font-size='40' font-family='Arial, Helvetica, sans-serif' font-weight='700' fill='%23${textColor}'>${label}</text></svg>`;
}

function matchesSurveyToMember(survey: ClientSurvey, memberProfile: ReturnType<typeof buildMemberProfile>) {
  if (survey.kind === "welcome") {
    return true;
  }

  const effectiveAudience = buildAudienceForDistributionStage(
    survey.audience,
    Math.max(1, normalizeSurveyDistributionStage(survey.distributionStage)) as 1 | 2 | 3 | 4
  );

  return matchesSurveyAudience(effectiveAudience, memberProfile);
}

function buildFallbackQuestions(survey: ClientSurvey): StoredSurveyQuestion[] {
  return [
    {
      id: `fallback-${survey.id}-1`,
      text: `How relevant is ${survey.name} to your experience?`,
      type: "Likert scale",
      options: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]
    },
    {
      id: `fallback-${survey.id}-2`,
      text: "Which option best matches your current preference?",
      type: "Single select",
      options: ["Very interested", "Somewhat interested", "Neutral", "Not interested"]
    },
    {
      id: `fallback-${survey.id}-3`,
      text: "Please share any detail that would help this research.",
      type: "Open question",
      options: ["Free-text response"]
    }
  ];
}

function getSurveyQuestions(survey: ClientSurvey) {
  return survey.questions?.length ? survey.questions : buildFallbackQuestions(survey);
}

function getSurveyAudienceLabel(survey: ClientSurvey) {
  if (survey.audience?.generalAudience || !survey.audience?.countries?.length) {
    return "General Audience";
  }

  return survey.audience.countries.join(", ");
}

function buildInitialAnswers(questions: StoredSurveyQuestion[]) {
  return questions.reduce<SurveyAnswerMap>((accumulator, question) => {
    if (question.type === "Multiple choice") {
      accumulator[question.id] = [];
      return accumulator;
    }

    if (question.type === "Ranking") {
      accumulator[question.id] = Array(question.options.length).fill("");
      return accumulator;
    }

    accumulator[question.id] = "";
    return accumulator;
  }, {});
}

function isAnswerComplete(question: StoredSurveyQuestion, answer: SurveyAnswerValue | undefined) {
  if (question.type === "Multiple choice") {
    return Array.isArray(answer) && answer.length > 0;
  }

  if (question.type === "Ranking") {
    if (!Array.isArray(answer)) return false;
    const normalized = answer.filter((item) => item !== "");
    return normalized.length === question.options.length && new Set(normalized).size === question.options.length;
  }

  return typeof answer === "string" && answer.trim().length > 0;
}

function formatCompletedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatDuration(seconds: number) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function normalizeCommunityCompletion(completion: CommunityCompletion): CommunityCompletion {
  const isWelcomeCompletion = completion.kind === "welcome";

  return {
    ...completion,
    summary:
      typeof completion.summary === "string" && completion.summary.trim().length > 0
        ? completion.summary
        : isWelcomeCompletion
          ? "Welcome survey completed and your first credits were unlocked."
          : "Survey completed before AI trust notes were enabled.",
    score:
      typeof completion.score === "number" && Number.isFinite(completion.score)
        ? Math.max(0, Math.min(100, Math.round(completion.score)))
        : null,
    durationSeconds:
      typeof completion.durationSeconds === "number" && completion.durationSeconds > 0
        ? completion.durationSeconds
        : 0,
    source:
      completion.source === "gemini"
        ? "gemini"
        : completion.source === "fixed"
          ? "fixed"
          : "fallback",
    kind: isWelcomeCompletion ? "welcome" : "standard"
  };
}

function sortCommunityCompletions(completions: CommunityCompletion[]) {
  return [...completions].sort(
    (left, right) =>
      new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime()
  );
}

function mergeCommunityCompletions(
  localCompletions: CommunityCompletion[],
  serverCompletions: CommunityCompletion[]
) {
  const mergedBySurveyId = new Map<number, CommunityCompletion>();

  for (const completion of localCompletions.map(normalizeCommunityCompletion)) {
    mergedBySurveyId.set(completion.surveyId, completion);
  }

  for (const completion of serverCompletions.map(normalizeCommunityCompletion)) {
    const current = mergedBySurveyId.get(completion.surveyId);

    if (!current) {
      mergedBySurveyId.set(completion.surveyId, completion);
      continue;
    }

    if (new Date(completion.completedAt).getTime() >= new Date(current.completedAt).getTime()) {
      mergedBySurveyId.set(completion.surveyId, completion);
    }
  }

  return sortCommunityCompletions([...mergedBySurveyId.values()]);
}

function readStoredCommunityCompletions(storageKey: string) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as CommunityProgress;

    return Array.isArray(parsedValue?.completions)
      ? sortCommunityCompletions(parsedValue.completions.map(normalizeCommunityCompletion))
      : [];
  } catch {
    return [];
  }
}

function readLocalAvatarSettings(storageKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<
      Pick<CommunitySettings, "avatarMode" | "avatarPreset" | "avatarCustomDataUrl">
    >;

    return {
      avatarMode:
        parsedValue.avatarMode === "custom" || parsedValue.avatarMode === "preset" || parsedValue.avatarMode === "default"
          ? parsedValue.avatarMode
          : null,
      avatarPreset: typeof parsedValue.avatarPreset === "string" ? parsedValue.avatarPreset : null,
      avatarCustomDataUrl: typeof parsedValue.avatarCustomDataUrl === "string" ? parsedValue.avatarCustomDataUrl : null
    };
  } catch {
    return null;
  }
}

export default function CommunityDashboard({
  initialProfile,
  adminHref
}: {
  initialProfile: UserProfile;
  adminHref?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseClient();
  const communityAnnouncementStorageKey = getCommunityDashboardAnnouncementStorageKey(initialProfile.id);
  const communitySettingsStorageKey = getCommunityDashboardSettingsStorageKey(initialProfile.id);
  const communityProgressStorageKey = getCommunityDashboardProgressStorageKey(initialProfile.id);
  const [profileSnapshot, setProfileSnapshot] = useState<UserProfile>(initialProfile);
  const [clientSurveys, setClientSurveys] = useState<ClientSurvey[]>([]);
  const [savedSettings, setSavedSettings] = useState<CommunitySettings>(() => buildInitialSettings(initialProfile));
  const [settingsForm, setSettingsForm] = useState<CommunitySettings>(() => buildInitialSettings(initialProfile));
  const [securityForm, setSecurityForm] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [activeSection, setActiveSection] = useState<DashboardSection>("dashboard");
  const [hasHydratedData, setHasHydratedData] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<TelegramLinkStatus | null>(null);
  const [isLoadingTelegramStatus, setIsLoadingTelegramStatus] = useState(true);
  const [isStartingTelegramLink, setIsStartingTelegramLink] = useState(false);
  const [isDisconnectingTelegram, setIsDisconnectingTelegram] = useState(false);
  const [isActivatingRewardId, setIsActivatingRewardId] = useState<string | null>(null);
  const [telegramMessage, setTelegramMessage] = useState("");
  const [telegramError, setTelegramError] = useState("");
  const [trustScoreOpen, setTrustScoreOpen] = useState(false);
  const [activatedRewardId, setActivatedRewardId] = useState<string | null>(null);
  const [rewardNotice, setRewardNotice] = useState<string | null>(null);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [rewardActivations, setRewardActivations] = useState<RewardActivation[]>([]);
  const [surveyNotice, setSurveyNotice] = useState<string | null>(null);
  const [surveyLoadError, setSurveyLoadError] = useState<string | null>(null);
  const [completedSurveys, setCompletedSurveys] = useState<CommunityCompletion[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null);
  const [surveyAnswers, setSurveyAnswers] = useState<SurveyAnswerMap>({});
  const [surveyError, setSurveyError] = useState("");
  const [hasStartedSelectedSurvey, setHasStartedSelectedSurvey] = useState(false);
  const [surveyStartedAt, setSurveyStartedAt] = useState<number | null>(null);
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState(false);
  const [isCommunityAnnouncementVisible, setIsCommunityAnnouncementVisible] = useState(true);
  const memberProfile = useMemo(() => buildMemberProfile(profileSnapshot), [profileSnapshot]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateDashboard() {
      try {
        const storedCompletions = readStoredCommunityCompletions(communityProgressStorageKey);

        if (storedCompletions.length > 0) {
          setCompletedSurveys(storedCompletions);
        }

        const [surveyResponse, rewardResponse] = await Promise.all([
          fetch("/api/surveys/available", { cache: "no-store" }),
          fetch("/api/rewards/activations", { cache: "no-store" })
        ]);
        const surveyData = (await surveyResponse.json().catch(() => ({}))) as {
          surveys?: ClientSurvey[];
          completions?: CommunityCompletion[];
          error?: string;
        };
        const rewardData = (await rewardResponse.json().catch(() => ({}))) as {
          activations?: RewardActivation[];
          error?: string;
        };

        if (!surveyResponse.ok) {
          throw new Error(surveyData.error ?? "Could not load surveys.");
        }

        if (!cancelled) {
          setSurveyLoadError(null);
          setClientSurveys(Array.isArray(surveyData.surveys) ? surveyData.surveys : []);

          if (Array.isArray(surveyData.completions)) {
            const normalizedCompletions = mergeCommunityCompletions(
              storedCompletions,
              surveyData.completions
            );
            setCompletedSurveys(normalizedCompletions);
            window.localStorage.setItem(
              communityProgressStorageKey,
              JSON.stringify({ completions: normalizedCompletions } satisfies CommunityProgress)
            );
          }

          if (rewardResponse.ok && Array.isArray(rewardData.activations)) {
            setRewardActivations(rewardData.activations);
            setRewardError(null);
          } else if (!rewardResponse.ok && rewardData.error) {
            setRewardError(rewardData.error);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setClientSurveys([]);
          setSurveyLoadError(error instanceof Error ? error.message : "Could not load surveys.");
        }
      } finally {
        if (!cancelled) {
          setHasHydratedData(true);
        }
      }
    }

    void hydrateDashboard();

    return () => {
      cancelled = true;
    };
  }, [communityProgressStorageKey]);

  useEffect(() => {
    const localAvatarSettings = readLocalAvatarSettings(communitySettingsStorageKey);

    if (!localAvatarSettings?.avatarMode) {
      return;
    }

    setSavedSettings((currentSettings) => ({
      ...currentSettings,
      avatarMode: localAvatarSettings.avatarMode ?? currentSettings.avatarMode,
      avatarPreset: localAvatarSettings.avatarPreset ?? currentSettings.avatarPreset,
      avatarCustomDataUrl: localAvatarSettings.avatarCustomDataUrl ?? currentSettings.avatarCustomDataUrl
    }));
    setSettingsForm((currentSettings) => ({
      ...currentSettings,
      avatarMode: localAvatarSettings.avatarMode ?? currentSettings.avatarMode,
      avatarPreset: localAvatarSettings.avatarPreset ?? currentSettings.avatarPreset,
      avatarCustomDataUrl: localAvatarSettings.avatarCustomDataUrl ?? currentSettings.avatarCustomDataUrl
    }));
    setProfileSnapshot((currentProfile) => ({
      ...currentProfile,
      avatarMode: localAvatarSettings.avatarMode ?? currentProfile.avatarMode,
      avatarPreset: localAvatarSettings.avatarPreset ?? currentProfile.avatarPreset,
      avatarCustomDataUrl: localAvatarSettings.avatarCustomDataUrl ?? currentProfile.avatarCustomDataUrl
    }));
  }, [communitySettingsStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const isDismissed = window.localStorage.getItem(communityAnnouncementStorageKey) === "dismissed";
    setIsCommunityAnnouncementVisible(!isDismissed);
  }, [communityAnnouncementStorageKey]);

  useEffect(() => {
    if (searchParams.get("error") === "access-denied") {
      setSurveyLoadError("403 Unauthorized. You can only access dashboards that belong to your account.");
    }

    const requestedSection = searchParams.get("section");

    if (
      requestedSection === "dashboard" ||
      requestedSection === "earnings" ||
      requestedSection === "rewards" ||
      requestedSection === "settings"
    ) {
      setActiveSection(requestedSection);
    }

    if (searchParams.get("telegram") === "setup") {
      setActiveSection("settings");
      setTelegramMessage("Finish Telegram activation below to receive new survey alerts.");
    }
  }, [searchParams]);

  useEffect(() => {
    void refreshTelegramStatus({ preserveMessage: true });
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest("[data-profile-menu]")) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const completedSurveyIds = useMemo(
    () => new Set(completedSurveys.map((completion) => completion.surveyId)),
    [completedSurveys]
  );

  const availableSurveys = useMemo(
    () =>
      clientSurveys
        .filter((survey) => survey.status !== "archived")
        .filter((survey) => matchesSurveyToMember(survey, memberProfile))
        .filter((survey) => !completedSurveyIds.has(survey.id)),
    [clientSurveys, completedSurveyIds, memberProfile]
  );

  const selectedSurvey = useMemo(
    () => availableSurveys.find((survey) => survey.id === selectedSurveyId) ?? null,
    [availableSurveys, selectedSurveyId]
  );
  const scoredCompletions = useMemo(
    () =>
      completedSurveys.filter(
        (completion): completion is CommunityCompletion & { score: number } =>
          typeof completion.score === "number"
      ),
    [completedSurveys]
  );
  const hasWelcomeCompletion = completedSurveys.some((completion) => completion.kind === "welcome");

  const totalEarnedCredits = completedSurveys.reduce(
    (sum, completion) => sum + completion.earnedCredits,
    0
  );
  const redeemedCredits = rewardActivations
    .filter((activation) => activation.status !== "cancelled")
    .reduce((sum, activation) => sum + activation.credits, 0);
  const totalCredits = Math.max(0, totalEarnedCredits - redeemedCredits);
  const doneSurveyCount = completedSurveys.length;
  const trustScore =
    scoredCompletions.length > 0
      ? Math.round(scoredCompletions.reduce((sum, completion) => sum + completion.score, 0) / scoredCompletions.length)
      : null;
  const trustScoreDisplay = trustScore === null ? (hasWelcomeCompletion ? "Pending" : "0%") : `${trustScore}%`;
  const creditsToday = completedSurveys
    .filter((completion) => new Date(completion.completedAt).toDateString() === new Date().toDateString())
    .reduce((sum, completion) => sum + completion.earnedCredits, 0);
  const rewardsByCategory = useMemo(
    () =>
      REWARD_CATEGORIES.map((category) => ({
        ...category,
        rewards: REWARDS.filter((reward) => reward.category === category.id)
      })).filter((category) => category.rewards.length > 0),
    []
  );

  const recentNotifications = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      time: string;
      icon: LucideIcon;
      iconBg: string;
      iconColor: string;
    }> = [];

    if (surveyNotice) {
      items.push({
        id: "survey-notice",
        title: surveyNotice,
        time: "Just now",
        icon: CheckCircle2,
        iconBg: "bg-[#efe7ff]",
        iconColor: "text-[#6d28d9]"
      });
    }

    if (availableSurveys[0]) {
      items.push({
        id: `survey-${availableSurveys[0].id}`,
        title:
          availableSurveys[0].kind === "welcome"
            ? `${availableSurveys[0].name} is ready with a guaranteed ${estimateSurveyCredits(availableSurveys[0])} credits`
            : `${availableSurveys[0].name} is available for your profile`,
        time: "Just now",
        icon: Sparkles,
        iconBg: "bg-[#f4efff]",
        iconColor: "text-[#7c3aed]"
      });
    }

    if (rewardNotice) {
      items.push({
        id: "reward-notice",
        title: rewardNotice,
        time: "Moments ago",
        icon: Gift,
        iconBg: "bg-[#f4efff]",
        iconColor: "text-[#7c3aed]"
      });
    }

    if (rewardError) {
      items.push({
        id: "reward-error",
        title: rewardError,
        time: "Moments ago",
        icon: AlertCircle,
        iconBg: "bg-[#fff1f3]",
        iconColor: "text-[#dc2626]"
      });
    }

    if (items.length === 0) {
      items.push({
        id: "welcome",
        title: "Your community dashboard is ready for upcoming survey matches.",
        time: "Today",
        icon: Sparkles,
        iconBg: "bg-[#f4efff]",
        iconColor: "text-[#7c3aed]"
      });
    }

    return items;
  }, [availableSurveys, rewardError, rewardNotice, surveyNotice]);

  const displayName = `${savedSettings.firstName} ${savedSettings.lastName}`.trim() || "Community member";
  const displayFirstName = savedSettings.firstName.trim() || "Member";
  const savedAvatarSrc = resolveAvatarSrc({
    role: "community",
    avatarMode: savedSettings.avatarMode,
    avatarPreset: savedSettings.avatarPreset,
    avatarCustomDataUrl: savedSettings.avatarCustomDataUrl
  });
  const hasUnsavedPhoneChange = settingsForm.phone.trim() !== savedSettings.phone.trim();
  const canActivateTelegram =
    Boolean(savedSettings.phone.trim()) &&
    isLikelyInternationalPhoneNumber(savedSettings.phone) &&
    telegramStatus?.botConfigured !== false &&
    !hasUnsavedPhoneChange &&
    !isSavingSettings &&
    !isStartingTelegramLink;
  const sectionTitleClassName = "text-[34px] font-bold tracking-[-0.04em] text-[#4f2a78]";
  const isSettingsDark = settingsForm.appearance === "dark";
  const settingsFormClassName = isSettingsDark
    ? "rounded-[28px] border border-[#2e2140] bg-[linear-gradient(180deg,#1d1528_0%,#17111f_100%)] p-8 text-white shadow-[0_22px_55px_rgba(15,23,42,0.18)]"
    : "rounded-[28px] border border-gray-200 bg-white p-8 shadow-[0_18px_44px_rgba(15,23,42,0.04)]";
  const settingsCardClassName = isSettingsDark
    ? "rounded-[24px] border border-[#342446] bg-[#21182d] p-6"
    : "rounded-[24px] border border-gray-200 bg-[#faf8ff] p-6";
  const settingsSecurityCardClassName = isSettingsDark
    ? "rounded-[24px] border border-[#342446] bg-[#1b1425] p-6"
    : "rounded-[24px] border border-gray-200 bg-[#fcfcff] p-6";
  const settingsInputClassName = isSettingsDark
    ? "w-full rounded-2xl border border-[#433154] bg-[#160f1f] px-4 py-3.5 text-[16px] text-white outline-none transition placeholder:text-[#8e7fa0] focus:border-[#8b5cf6]"
    : "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none transition focus:border-[#7c3aed]";
  const settingsLabelClassName = isSettingsDark ? "mb-2 flex items-center gap-2 text-sm font-medium text-[#ddd2ef]" : "mb-2 flex items-center gap-2 text-sm font-medium text-[#4b5563]";
  const settingsMutedTextClassName = isSettingsDark ? "text-[#a79bbc]" : "text-[#8a94a6]";
  const settingsBodyTextClassName = isSettingsDark ? "text-[#cbc3da]" : "text-[#6b7280]";

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsProfileMenuOpen(false);
    router.push("/auth?type=community");
    router.refresh();
  }

  function handleDismissCommunityAnnouncement() {
    setIsCommunityAnnouncementVisible(false);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(communityAnnouncementStorageKey, "dismissed");
    }
  }

  function handleSettingsChange<Key extends keyof CommunitySettings>(field: Key, value: CommunitySettings[Key]) {
    setSettingsSaved(false);
    setSettingsError("");
    setSettingsForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleSecurityChange(field: "newPassword" | "confirmPassword", value: string) {
    setSettingsSaved(false);
    setSettingsError("");
    setSecurityForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleAvatarChange(value: Pick<CommunitySettings, "avatarMode" | "avatarPreset" | "avatarCustomDataUrl">) {
    setSettingsSaved(false);
    setSettingsError("");
    setSettingsForm((current) => ({
      ...current,
      ...value
    }));
  }

  async function refreshTelegramStatus(options?: { preserveMessage?: boolean }) {
    setIsLoadingTelegramStatus(true);

    if (!options?.preserveMessage) {
      setTelegramError("");
    }

    try {
      const response = await fetch("/api/telegram/link", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as Partial<TelegramLinkStatus> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load Telegram status.");
      }

      setTelegramStatus({
        linked: Boolean(data.linked),
        phoneNumber: typeof data.phoneNumber === "string" ? data.phoneNumber : "",
        phoneAvailable: Boolean(data.phoneAvailable),
        phoneReady: Boolean(data.phoneReady),
        phoneMismatch: Boolean(data.phoneMismatch),
        botConfigured: Boolean(data.botConfigured),
        botConfigurationError:
          typeof data.botConfigurationError === "string"
            ? data.botConfigurationError
            : null,
        botUsername: typeof data.botUsername === "string" ? data.botUsername : null,
        notificationsEnabled: Boolean(data.notificationsEnabled),
        telegramUsername:
          typeof data.telegramUsername === "string" ? data.telegramUsername : null,
        linkedAt: typeof data.linkedAt === "string" ? data.linkedAt : null
      });
    } catch (error) {
      setTelegramError(
        error instanceof Error ? error.message : "Could not load Telegram status."
      );
    } finally {
      setIsLoadingTelegramStatus(false);
    }
  }

  async function handleStartTelegramLink() {
    if (isStartingTelegramLink) {
      return;
    }

    setTelegramError("");
    setTelegramMessage("");
    setIsStartingTelegramLink(true);
    const popup = window.open("", "_blank", "noopener,noreferrer");

    try {
      const response = await fetch("/api/telegram/link", {
        method: "POST"
      });
      const data = (await response.json().catch(() => ({}))) as {
        botUrl?: string;
        instructions?: string;
        error?: string;
      };

      if (!response.ok || !data.botUrl) {
        throw new Error(data.error ?? "Could not create Telegram activation link.");
      }

      if (popup) {
        popup.location.href = data.botUrl;
      } else {
        window.location.href = data.botUrl;
      }

      setTelegramMessage(
        data.instructions ??
          "Finish the Telegram activation steps, then refresh your status here."
      );
    } catch (error) {
      popup?.close();
      setTelegramError(
        error instanceof Error
          ? error.message
          : "Could not create Telegram activation link."
      );
    } finally {
      setIsStartingTelegramLink(false);
    }
  }

  async function handleDisconnectTelegram() {
    if (isDisconnectingTelegram) {
      return;
    }

    setTelegramError("");
    setTelegramMessage("");
    setIsDisconnectingTelegram(true);

    try {
      const response = await fetch("/api/telegram/link", {
        method: "DELETE"
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not disconnect Telegram notifications.");
      }

      setTelegramMessage("Telegram notifications were disconnected.");
      await refreshTelegramStatus({ preserveMessage: true });
    } catch (error) {
      setTelegramError(
        error instanceof Error
          ? error.message
          : "Could not disconnect Telegram notifications."
      );
    } finally {
      setIsDisconnectingTelegram(false);
    }
  }

  async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (securityForm.newPassword || securityForm.confirmPassword) {
      if (securityForm.newPassword !== securityForm.confirmPassword) {
        setSettingsSaved(false);
        setSettingsError("Passwords do not match.");
        return;
      }
    }

    setIsSavingSettings(true);
    setSettingsSaved(false);
    setSettingsError("");

    const nextSettings = {
      ...settingsForm,
      firstName: settingsForm.firstName.trim(),
      lastName: settingsForm.lastName.trim(),
      email: settingsForm.email.trim().toLowerCase(),
      phone: settingsForm.phone.trim()
    };

    try {
      const authUpdatePayload: {
        email?: string;
        password?: string;
        data: Record<string, unknown>;
      } = {
        data: {
          role: "community",
          first_name: nextSettings.firstName,
          last_name: nextSettings.lastName,
          phone_number: nextSettings.phone,
          country: profileSnapshot.country,
          age_span: profileSnapshot.ageSpan,
          gender: profileSnapshot.gender,
          employment_status: profileSnapshot.employmentStatus,
          industry: profileSnapshot.industry,
          salary_range: profileSnapshot.salaryRange,
          educational_level: profileSnapshot.educationalLevel,
          field_of_study: profileSnapshot.fieldOfStudy,
          language_skills: profileSnapshot.languageSkills,
          english_proficiency: profileSnapshot.englishProficiency,
          place_of_residence: profileSnapshot.placeOfResidence,
          family_status: profileSnapshot.familyStatus,
          household_size: profileSnapshot.householdSize,
          children_count: profileSnapshot.childrenCount,
          interests: profileSnapshot.interests,
          car_count: profileSnapshot.carCount,
          appearance: nextSettings.appearance,
          two_factor_enabled: nextSettings.twoFactorEnabled,
          [AVATAR_METADATA_KEYS.mode]: nextSettings.avatarMode === "custom" ? "default" : nextSettings.avatarMode,
          [AVATAR_METADATA_KEYS.preset]: nextSettings.avatarPreset,
          [AVATAR_METADATA_KEYS.customDataUrl]: ""
        }
      };

      if (nextSettings.email !== savedSettings.email.trim().toLowerCase()) {
        authUpdatePayload.email = nextSettings.email;
      }

      if (securityForm.newPassword) {
        authUpdatePayload.password = securityForm.newPassword;
      }

      const { error: authError } = await supabase.auth.updateUser(authUpdatePayload);

      if (authError) {
        throw authError;
      }

      const nextProfileSnapshot: UserProfile = {
        ...profileSnapshot,
        email: nextSettings.email,
        firstName: nextSettings.firstName,
        lastName: nextSettings.lastName,
        phoneNumber: nextSettings.phone,
        appearance: nextSettings.appearance,
        twoFactorEnabled: nextSettings.twoFactorEnabled,
        avatarMode: nextSettings.avatarMode,
        avatarPreset: nextSettings.avatarPreset,
        avatarCustomDataUrl: nextSettings.avatarCustomDataUrl
      };

      await upsertProfileRecords(supabase, nextProfileSnapshot.id, buildPersistedProfilePayload(nextProfileSnapshot));

      window.localStorage.setItem(
        communitySettingsStorageKey,
        JSON.stringify({
          avatarMode: nextSettings.avatarMode,
          avatarPreset: nextSettings.avatarPreset,
          avatarCustomDataUrl: nextSettings.avatarCustomDataUrl
        })
      );

      setProfileSnapshot(nextProfileSnapshot);
      setSavedSettings(nextSettings);
      setSettingsForm(nextSettings);
      setSecurityForm({
        newPassword: "",
        confirmPassword: ""
      });
      setSettingsSaved(true);

      if (nextSettings.phone !== savedSettings.phone) {
        setTelegramMessage(
          "Phone number updated. If you changed the number used for Telegram alerts, activate Telegram again to verify the new number."
        );
      }

      await refreshTelegramStatus({ preserveMessage: true });
    } catch (error) {
      setSettingsError(getSettingsErrorMessage(error));
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleActivateReward(reward: RewardCatalogItem) {
    setRewardError(null);
    setRewardNotice(null);

    if (totalCredits < reward.credits) {
      setActivatedRewardId(null);
      setRewardError(`Your credit is not enough for ${reward.company}.`);
      return;
    }

    try {
      setIsActivatingRewardId(reward.id);

      const response = await fetch("/api/rewards/activations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          rewardId: reward.id
        })
      });
      const data = (await response.json().catch(() => ({}))) as {
        activation?: RewardActivation;
        message?: string;
        error?: string;
      };

      if (!response.ok || !data.activation) {
        throw new Error(data.error ?? "Could not activate reward.");
      }

      setRewardActivations((currentActivations) => [data.activation as RewardActivation, ...currentActivations]);
      setActivatedRewardId(reward.id);
      setRewardNotice(
        data.message ??
          (reward.id === "withdraw-cash"
            ? `Cash withdrawal request has been sent to ${savedSettings.email}.`
            : `${reward.company} reward has been sent to ${savedSettings.email}.`)
      );
    } catch (error) {
      setActivatedRewardId(null);
      setRewardError(error instanceof Error ? error.message : "Could not activate reward.");
    } finally {
      setIsActivatingRewardId(null);
    }
  }

  function handleOpenSurvey(survey: ClientSurvey) {
    const questions = getSurveyQuestions(survey);
    setSelectedSurveyId(survey.id);
    setSurveyAnswers(buildInitialAnswers(questions));
    setSurveyError("");
    setHasStartedSelectedSurvey(false);
    setSurveyStartedAt(null);
    setActiveSection("take-survey");
  }

  function handleStartSelectedSurvey() {
    setSurveyError("");
    setHasStartedSelectedSurvey(true);
    setSurveyStartedAt(Date.now());
  }

  function handleSingleAnswerChange(questionId: string, value: string) {
    setSurveyError("");
    setSurveyAnswers((current) => ({
      ...current,
      [questionId]: value
    }));
  }

  function handleMultipleAnswerToggle(questionId: string, option: string) {
    setSurveyError("");
    setSurveyAnswers((current) => {
      const currentValue = current[questionId];
      const nextValues = Array.isArray(currentValue) ? [...currentValue] : [];
      const hasOption = nextValues.includes(option);

      return {
        ...current,
        [questionId]: hasOption ? nextValues.filter((item) => item !== option) : [...nextValues, option]
      };
    });
  }

  function handleRankingChange(questionId: string, optionIndex: number, value: string) {
    setSurveyError("");
    setSurveyAnswers((current) => {
      const currentValue = current[questionId];
      const ranking = Array.isArray(currentValue) ? [...currentValue] : [];
      ranking[optionIndex] = value;

      return {
        ...current,
        [questionId]: ranking
      };
    });
  }

  async function refreshSurveyStateFromServer() {
    const response = await fetch("/api/surveys/available", { cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as {
      surveys?: ClientSurvey[];
      completions?: CommunityCompletion[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Could not refresh community dashboard.");
    }

    const nextSurveys = Array.isArray(data.surveys) ? data.surveys : [];
    const nextCompletions = Array.isArray(data.completions)
      ? data.completions.map(normalizeCommunityCompletion)
      : [];
    const storedCompletions = readStoredCommunityCompletions(communityProgressStorageKey);
    const mergedCompletions = mergeCommunityCompletions(storedCompletions, nextCompletions);

    setClientSurveys(nextSurveys);
    setCompletedSurveys(mergedCompletions);
    window.localStorage.setItem(
      communityProgressStorageKey,
      JSON.stringify({ completions: mergedCompletions } satisfies CommunityProgress)
    );
  }

  async function handleSubmitSurvey() {
    if (!selectedSurvey) {
      return;
    }

    if (isSubmittingSurvey) {
      return;
    }

    const questions = getSurveyQuestions(selectedSurvey);
    const hasIncompleteAnswer = questions.some((question) => !isAnswerComplete(question, surveyAnswers[question.id]));

    if (hasIncompleteAnswer) {
      setSurveyError("Please answer every question before submitting the survey.");
      return;
    }

    setIsSubmittingSurvey(true);

    try {
      const completionTimeSeconds = Math.max(
        1,
        surveyStartedAt ? Math.round((Date.now() - surveyStartedAt) / 1000) : questions.length * 15
      );
      const submissionAnswers = buildSurveySubmissionAnswers(questions, surveyAnswers);

      let completion: CommunityCompletion;
      let successMessage = "";

      if (selectedSurvey.kind === "welcome") {
        const submitResponse = await fetch(`/api/surveys/${selectedSurvey.id}/responses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            completionTimeSeconds,
            answers: submissionAnswers
          })
        });

        const submitData = (await submitResponse.json().catch(() => ({}))) as {
          submittedAt?: string;
          earnedCredits?: number;
          summary?: string;
          source?: SurveyTrustEvaluationResponse["source"];
          error?: string;
        };

        if (!submitResponse.ok) {
          throw new Error(submitData.error ?? "Welcome survey submission failed.");
        }

        const earnedCredits =
          typeof submitData.earnedCredits === "number"
            ? submitData.earnedCredits
            : selectedSurvey.fixedCredits ?? WELCOME_SURVEY_CREDITS;
        const summary =
          typeof submitData.summary === "string" && submitData.summary.trim().length > 0
            ? submitData.summary
            : "Congratulations! You've completed your first survey 🎉";

        completion = {
          surveyId: selectedSurvey.id,
          surveyName: selectedSurvey.name,
          earnedCredits,
          score: null,
          completedAt: submitData.submittedAt ?? new Date().toISOString(),
          summary,
          durationSeconds: completionTimeSeconds,
          source: submitData.source === "fixed" ? "fixed" : "fallback",
          kind: "welcome"
        };
        successMessage = `${selectedSurvey.name} submitted successfully. ${earnedCredits} welcome credits added to your balance. ${summary}`;
      } else {
        const evaluationRequest: SurveyTrustEvaluationRequest = {
          surveyTitle: selectedSurvey.name,
          surveyDescription: selectedSurvey.description,
          questions,
          answers: submissionAnswers,
          completionTimeSeconds
        };

        let evaluation: SurveyTrustEvaluationResponse;

        try {
          const response = await fetch("/api/survey-trust-score", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(evaluationRequest)
          });

          const responseBody = (await response.json()) as Partial<SurveyTrustEvaluationResponse> & {
            error?: string;
          };

          if (
            !response.ok ||
            typeof responseBody.trustScore !== "number" ||
            typeof responseBody.credits !== "number"
          ) {
            throw new Error(responseBody.error ?? "AI trust scoring failed.");
          }

          evaluation = {
            trustScore: responseBody.trustScore,
            credits: responseBody.credits,
            summary: responseBody.summary ?? "AI reviewed the response quality and timing.",
            strengths: Array.isArray(responseBody.strengths) ? responseBody.strengths : [],
            risks: Array.isArray(responseBody.risks) ? responseBody.risks : [],
            completionTimeSeconds: responseBody.completionTimeSeconds ?? completionTimeSeconds,
            source: responseBody.source === "gemini" ? "gemini" : "fallback"
          };
        } catch {
          evaluation = buildFallbackTrustEvaluation(evaluationRequest);
        }

        const submitResponse = await fetch(`/api/surveys/${selectedSurvey.id}/responses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            completionTimeSeconds: evaluation.completionTimeSeconds,
            trustScore: evaluation.trustScore,
            earnedCredits: evaluation.credits,
            summary: evaluation.summary,
            answers: evaluationRequest.answers
          })
        });

        const submitData = (await submitResponse.json().catch(() => ({}))) as {
          submittedAt?: string;
          error?: string;
        };

        if (!submitResponse.ok) {
          throw new Error(submitData.error ?? "Survey submission failed.");
        }

        completion = {
          surveyId: selectedSurvey.id,
          surveyName: selectedSurvey.name,
          earnedCredits: evaluation.credits,
          score: evaluation.trustScore,
          completedAt: submitData.submittedAt ?? new Date().toISOString(),
          summary: evaluation.summary,
          durationSeconds: evaluation.completionTimeSeconds,
          source: evaluation.source,
          kind: "standard"
        };
        successMessage = `${selectedSurvey.name} submitted successfully. ${evaluation.credits} credits added from your ${evaluation.trustScore}% trust score. ${evaluation.summary}`;
      }

      const nextCompletions = mergeCommunityCompletions(completedSurveys, [completion]);
      window.localStorage.setItem(
        communityProgressStorageKey,
        JSON.stringify({ completions: nextCompletions } satisfies CommunityProgress)
      );
      setCompletedSurveys(nextCompletions);

      setClientSurveys((currentSurveys) =>
        currentSurveys.map((survey) =>
          survey.id === selectedSurvey.id
            ? {
                ...survey,
                responses: Math.min(survey.targetResponses, survey.responses + 1)
              }
            : survey
        )
      );

      setSurveyNotice(successMessage);
      setSelectedSurveyId(null);
      setSurveyAnswers({});
      setSurveyError("");
      setHasStartedSelectedSurvey(false);
      setSurveyStartedAt(null);
      setActiveSection("earnings");
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("already submitted")) {
        try {
          await refreshSurveyStateFromServer();
          setSelectedSurveyId(null);
          setSurveyAnswers({});
          setHasStartedSelectedSurvey(false);
          setSurveyStartedAt(null);
          setActiveSection("earnings");
          setSurveyNotice("This survey was already submitted earlier. Your saved credits and completion history have been restored.");
          setSurveyError("");
        } catch (refreshError) {
          setSurveyError(
            refreshError instanceof Error ? refreshError.message : "Survey submission failed."
          );
        }
      } else {
        setSurveyError(error instanceof Error ? error.message : "Survey submission failed.");
      }
    } finally {
      setIsSubmittingSurvey(false);
    }
  }

  function renderSurveyInput(question: StoredSurveyQuestion) {
    const answer = surveyAnswers[question.id];

    if (question.type === "Open question") {
      return (
        <textarea
          value={typeof answer === "string" ? answer : ""}
          onChange={(event) => handleSingleAnswerChange(question.id, event.target.value)}
          rows={4}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 outline-none transition focus:border-[#7c3aed]"
          placeholder="Write your answer here..."
        />
      );
    }

    if (question.type === "Multiple choice") {
      const selectedValues = Array.isArray(answer) ? answer : [];

      return (
        <div className="grid gap-3">
          {question.options.map((option) => {
            const isChecked = selectedValues.includes(option);

            return (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                  isChecked ? "border-[#cbb4ff] bg-[#f7f2ff]" : "border-gray-200 bg-white hover:border-[#dccbff]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleMultipleAnswerToggle(question.id, option)}
                  className="h-4 w-4 rounded border-gray-300 text-[#7c3aed] focus:ring-[#7c3aed]"
                />
                <span className="text-sm font-medium text-[#374151]">{option}</span>
              </label>
            );
          })}
        </div>
      );
    }

    if (question.type === "Ranking") {
      const rankingValues = Array.isArray(answer) ? answer : Array(question.options.length).fill("");

      return (
        <div className="grid gap-3">
          {question.options.map((option, index) => (
            <div key={option} className="grid gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 md:grid-cols-[minmax(0,1fr)_120px]">
              <span className="text-sm font-medium text-[#374151]">{option}</span>
              <select
                value={rankingValues[index] ?? ""}
                onChange={(event) => handleRankingChange(question.id, index, event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#7c3aed]"
              >
                <option value="">Select rank</option>
                {question.options.map((_, rankIndex) => (
                  <option key={`${option}-${rankIndex + 1}`} value={String(rankIndex + 1)}>
                    {rankIndex + 1}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid gap-3">
        {question.options.map((option) => {
          const isSelected = answer === option;

          return (
            <label
              key={option}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                isSelected ? "border-[#cbb4ff] bg-[#f7f2ff]" : "border-gray-200 bg-white hover:border-[#dccbff]"
              }`}
            >
              <input
                type="radio"
                name={question.id}
                checked={isSelected}
                onChange={() => handleSingleAnswerChange(question.id, option)}
                className="h-4 w-4 border-gray-300 text-[#7c3aed] focus:ring-[#7c3aed]"
              />
              <span className="text-sm font-medium text-[#374151]">{option}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (!hasHydratedData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-4 text-sm text-gray-500 shadow-sm">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-transparent">
      <aside className="hidden h-screen w-64 border-r border-gray-100 bg-white shadow-sm lg:block">
        <div className="p-6">
          <Link
            href="/"
            aria-label="Go to landing page"
            className="mb-8 flex items-center space-x-3 transition-opacity hover:opacity-85"
          >
            <SiteLogo label="MERGEN AI" markClassName="h-11" textClassName="text-[17px] font-semibold text-gray-900 sm:text-[17px]" />
          </Link>

          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeSection === item.section;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActiveSection(item.section)}
                  className={`flex w-full items-center space-x-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
                    isActive
                      ? "bg-[#f5f0ff] text-[#6d3fd1] shadow-[0_12px_28px_rgba(124,58,237,0.12)]"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <IconComponent className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <div className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-6 shadow-sm lg:justify-end">
          <Link
            href="/"
            aria-label="Go to landing page"
            className="flex items-center space-x-3 transition-opacity hover:opacity-85 lg:hidden"
          >
            <SiteLogo label="MERGEN AI" markClassName="h-10" textClassName="font-semibold text-gray-900 sm:text-lg" />
          </Link>

          <div className="flex items-center space-x-4">
            {adminHref ? (
              <Link
                href={adminHref}
                className="hidden rounded-full border border-[#e4d6ff] bg-[#f5f0ff] px-4 py-2 text-sm font-semibold text-[#6d3fd1] transition hover:border-[#d7c3ff] hover:bg-[#efe7ff] sm:inline-flex"
              >
                Admin panel
              </Link>
            ) : null}
            <div className="relative flex items-center space-x-3 border-l border-gray-200 pl-4" data-profile-menu>
              <div className="flex flex-col text-right">
                <span className="text-sm font-medium text-gray-900">{displayName}</span>
                <span className="text-xs text-gray-500">Community member</span>
              </div>
              <button
                type="button"
                aria-label="Open profile menu"
                onClick={() => setIsProfileMenuOpen((current) => !current)}
                className="rounded-full transition-opacity hover:opacity-90"
              >
                <ImageWithFallback
                  src={savedAvatarSrc}
                  fallbackSrc={getDefaultAvatarSrc("community")}
                  alt="Profile"
                  className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm"
                />
              </button>

              {isProfileMenuOpen ? (
                <div className="absolute right-0 top-12 z-20 min-w-[160px] rounded-xl border border-gray-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {surveyLoadError ? (
              <div className="rounded-2xl border border-[#eadfff] bg-[#f8f4ff] px-5 py-4 text-sm text-[#6d28d9]">
                {surveyLoadError}
              </div>
            ) : null}

            {activeSection === "dashboard" ? (
              <>
                {isCommunityAnnouncementVisible ? (
                  <div className="relative overflow-hidden rounded-[28px] border border-[#dbc9ff] bg-[linear-gradient(135deg,#f6edff_0%,#efe2ff_100%)] p-6 shadow-[0_18px_44px_rgba(124,58,237,0.10)]">
                    <button
                      type="button"
                      onClick={handleDismissCommunityAnnouncement}
                      aria-label="Close announcement"
                      className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dfd0ff] bg-white/85 text-[#6d3fd1] transition hover:bg-white"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    <div className="flex max-w-4xl items-start gap-4 pr-12">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-white/70 text-[#7c3aed] shadow-sm">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b5cf6]">
                          Community Update
                        </p>
                        <p className="mt-3 text-[16px] leading-8 text-[#5b3a86]">
                          {COMMUNITY_ONBOARDING_ANNOUNCEMENT}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="relative mb-8 h-64 overflow-hidden rounded-2xl shadow-lg">
                  <div className="absolute inset-0 bg-[linear-gradient(115deg,#3f2462_0%,#5b2d91_22%,#7c3aed_52%,#6941c6_76%,#9b6bff_100%)]" />
                  <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(102deg,transparent_0%,rgba(255,255,255,0.12)_11%,transparent_18%,transparent_31%,rgba(255,255,255,0.08)_39%,transparent_47%,transparent_58%,rgba(255,255,255,0.12)_67%,transparent_75%,transparent_86%,rgba(255,255,255,0.1)_95%,transparent_100%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(180,141,255,0.28),transparent_32%)]" />

                  <div className="relative z-10 flex h-full items-center px-8">
                    <div className="text-white">
                      <h1 className="mb-2 text-3xl font-bold">Welcome back, {displayFirstName}! ✨</h1>
                      <p className="text-lg text-violet-100">Find matched surveys, grow your trust score, and turn your input into rewards.</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setTrustScoreOpen((current) => !current)}
                    className="rounded-xl border border-gray-100 bg-white p-6 text-left shadow-sm transition hover:border-[#d9c7ff] hover:shadow-[0_14px_30px_rgba(124,58,237,0.10)]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="mb-1 text-sm text-gray-500">Trust Score</p>
                        <p className="text-3xl font-bold text-gray-900">{trustScoreDisplay}</p>
                      </div>
                      <div className="rounded-lg bg-[#f4efff] p-3">
                        <Shield className="h-6 w-6 text-[#7c3aed]" />
                      </div>
                    </div>
                  </button>

                  <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="mb-1 text-sm text-gray-500">Credit Balance</p>
                        <p className="text-3xl font-bold text-gray-900">{totalCredits} credit</p>
                      </div>
                      <div className="rounded-lg bg-[#eef2ff] p-3">
                        <Wallet className="h-6 w-6 text-[#6941c6]" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="mb-1 text-sm text-gray-500">Done Surveys</p>
                        <p className="text-3xl font-bold text-gray-900">{doneSurveyCount}</p>
                      </div>
                      <div className="rounded-lg bg-[#f3e8ff] p-3">
                        <CheckCircle2 className="h-6 w-6 text-[#7c3aed]" />
                      </div>
                    </div>
                  </div>
                </div>

                {trustScoreOpen ? (
                  <div className="mb-8 rounded-2xl border border-[#dccbff] bg-[#faf7ff] p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl bg-[#efe7ff] p-3">
                        <Info className="h-5 w-5 text-[#7c3aed]" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-[#4f2a78]">How trust score is calculated</h2>
                        <p className="mt-2 text-sm leading-7 text-[#667085]">
                          AI reviews response consistency, attention checks, completion quality, thoughtful open-answer depth,
                          and realistic timing patterns. Higher-quality answers increase your future survey access and reward trust.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mb-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Available Surveys</h2>
                    <span className="rounded-full bg-[#f4efff] px-3 py-1 text-xs font-semibold text-[#6d3fd1]">
                      {availableSurveys.length} match{availableSurveys.length === 1 ? "" : "es"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
                    {availableSurveys.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-gray-500">No surveys match your current community profile yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {availableSurveys.map((survey) => (
                          <div key={survey.id} className="p-6 transition-colors duration-200 hover:bg-gray-50">
                            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                              <div className="flex-1">
                                <div className="mb-3 flex items-center space-x-3">
                                  <h3 className="font-semibold text-gray-900">{survey.name}</h3>
                                  <span className="rounded-full bg-[#efe7ff] px-2.5 py-0.5 text-xs font-medium text-[#6941c6]">
                                    {survey.kind === "welcome" ? "welcome bonus" : "matched"}
                                  </span>
                                </div>

                                <p className="max-w-3xl text-[15px] leading-6 text-[#667085]">{survey.description}</p>

                                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
                                  <div>
                                    <p className="text-xs text-gray-500">Region / countries</p>
                                    <p className="font-semibold text-gray-900">
                                      {getSurveyAudienceLabel(survey)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Reward</p>
                                    <p className="font-semibold text-gray-900">{estimateSurveyCredits(survey)} credits</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Question count</p>
                                    <p className="font-semibold text-gray-900">{getSurveyQuestions(survey).length}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Status</p>
                                    <p className="font-semibold text-gray-900 capitalize">{survey.status}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSurvey(survey)}
                                  className="rounded-full bg-[linear-gradient(135deg,#6d3fd1_0%,#8b5cf6_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(124,58,237,0.22)] transition hover:opacity-90"
                                >
                                  {survey.kind === "welcome" ? "Start Welcome Survey" : "Open Survey"}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
                    <span className="text-sm text-gray-500">Recent notifications</span>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="space-y-4">
                      {recentNotifications.map((activity) => {
                        const IconComponent = activity.icon;

                        return (
                          <div
                            key={activity.id}
                            className="flex items-center space-x-4 rounded-lg p-3 transition-colors duration-200 hover:bg-gray-50"
                          >
                            <div className={`rounded-lg p-2 ${activity.iconBg}`}>
                              <IconComponent className={`h-4 w-4 ${activity.iconColor}`} />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{activity.title}</p>
                              <div className="mt-1 flex items-center space-x-2">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">{activity.time}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            ) : activeSection === "take-survey" ? (
              selectedSurvey ? (
                <section className="max-w-5xl space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h1 className={sectionTitleClassName}>Take Survey</h1>
                      <p className="mt-3 text-[16px] text-[#667085]">
                        {selectedSurvey.kind === "welcome"
                          ? `Complete your welcome survey to unlock ${estimateSurveyCredits(selectedSurvey)} guaranteed credits.`
                          : "Answer the full survey and submit it to add credits to your balance."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection("dashboard");
                        setSelectedSurveyId(null);
                        setSurveyError("");
                        setHasStartedSelectedSurvey(false);
                        setSurveyStartedAt(null);
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#4b5563] transition hover:border-[#d9c7ff] hover:text-[#6d3fd1]"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                  </div>

                  <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)] sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-[24px] font-semibold text-[#111827]">{selectedSurvey.name}</h2>
                        <p className="mt-2 max-w-3xl text-[15px] leading-7 text-[#667085]">{selectedSurvey.description}</p>
                      </div>
                      <div className="rounded-[20px] border border-[#dccbff] bg-[#faf7ff] px-4 py-3 text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b5cf6]">Reward</p>
                        <p className="mt-1 text-[22px] font-bold text-[#4f2a78]">{estimateSurveyCredits(selectedSurvey)} credits</p>
                        <p className="mt-1 text-xs text-[#8a94a6]">{getSurveyRewardNote(selectedSurvey)}</p>
                      </div>
                    </div>

                    {!hasStartedSelectedSurvey ? (
                      <div className="mt-8 rounded-[24px] border border-[#dccbff] bg-[#faf7ff] p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c3aed]">
                          Before You Start
                        </p>
                        <p className="mt-4 text-[16px] leading-8 text-[#4f2a78]">
                          {selectedSurvey.description ||
                            "Review this survey introduction, then start when you are ready."}
                        </p>
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={handleStartSelectedSurvey}
                            className="rounded-full bg-[linear-gradient(135deg,#6d3fd1_0%,#8b5cf6_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(124,58,237,0.22)] transition hover:opacity-90"
                          >
                            Start Survey
                          </button>
                          <p className="text-sm text-[#8a94a6]">
                            Questions will open after you confirm you are ready to begin.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mt-8 space-y-5">
                          {getSurveyQuestions(selectedSurvey).map((question, index) => (
                            <div key={question.id} className="rounded-[24px] border border-gray-200 bg-[#fcfcff] p-5">
                              <div className="mb-4 flex items-center gap-3">
                                <div className="rounded-full bg-[#f1ebff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#7c3aed]">
                                  Q{index + 1}
                                </div>
                                <div className="text-sm text-[#98a2b3]">{question.type}</div>
                              </div>
                              <h3 className="text-[18px] font-semibold leading-7 text-[#1f2937]">{question.text}</h3>
                              <div className="mt-4">{renderSurveyInput(question)}</div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-6">
                          <div>{surveyError ? <p className="text-sm font-medium text-red-500">{surveyError}</p> : null}</div>
                          <button
                            type="button"
                            onClick={() => void handleSubmitSurvey()}
                            disabled={isSubmittingSurvey}
                            className="rounded-full bg-[linear-gradient(135deg,#6d3fd1_0%,#8b5cf6_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(124,58,237,0.22)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSubmittingSurvey
                              ? selectedSurvey.kind === "welcome"
                                ? "Submitting..."
                                : "AI Reviewing..."
                              : selectedSurvey.kind === "welcome"
                                ? "Complete Welcome Survey"
                                : "Submit Survey"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </section>
              ) : (
                <section className="max-w-5xl">
                  <div className="rounded-[24px] border border-gray-200 bg-white p-8 text-center shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
                    <p className="text-[18px] font-semibold text-[#4f2a78]">No survey selected.</p>
                    <button
                      type="button"
                      onClick={() => setActiveSection("dashboard")}
                      className="mt-4 rounded-full bg-[linear-gradient(135deg,#6d3fd1_0%,#8b5cf6_100%)] px-5 py-3 text-sm font-semibold text-white"
                    >
                      Back to Dashboard
                    </button>
                  </div>
                </section>
              )
            ) : activeSection === "earnings" ? (
              <section className="max-w-5xl space-y-6">
                <div>
                  <h1 className={sectionTitleClassName}>Earnings Overview</h1>
                  <p className="mt-3 text-[15px] uppercase tracking-[0.18em] text-[#8a94a6]">Credits and survey payout history</p>
                </div>

                {surveyNotice ? (
                  <div className="rounded-[24px] border border-[#d9c7ff] bg-[#faf7ff] p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-[#efe7ff] p-3">
                        <CheckCircle2 className="h-5 w-5 text-[#7c3aed]" />
                      </div>
                      <div>
                        <h2 className="text-[18px] font-semibold text-[#4f2a78]">Survey completed</h2>
                        <p className="mt-1 text-sm leading-7 text-[#667085]">{surveyNotice}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#f4efff]">
                      <TrendingUp className="h-7 w-7 text-[#7c3aed]" />
                    </div>
                    <p className="mt-6 text-[16px] text-[#7c8699]">Credits today</p>
                    <p className="mt-3 text-[38px] font-bold leading-none text-[#111827]">{creditsToday}</p>
                  </div>

                  <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#efe7ff]">
                      <Wallet className="h-7 w-7 text-[#6941c6]" />
                    </div>
                    <p className="mt-6 text-[16px] text-[#7c8699]">Balance</p>
                    <p className="mt-3 text-[38px] font-bold leading-none text-[#111827]">{totalCredits} credit</p>
                  </div>

                  <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#f7f2ff]">
                      <CheckCircle2 className="h-7 w-7 text-[#7c3aed]" />
                    </div>
                    <p className="mt-6 text-[16px] text-[#7c8699]">Done surveys</p>
                    <p className="mt-3 text-[38px] font-bold leading-none text-[#111827]">{doneSurveyCount}</p>
                  </div>
                </div>

                <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.04)] sm:p-6">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <h2 className="text-[22px] font-bold tracking-[-0.03em] text-[#1f2937]">Survey Earnings</h2>
                  </div>

                  {completedSurveys.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-separate border-spacing-0">
                        <thead>
                          <tr className="text-left text-[13px] font-semibold uppercase tracking-[0.08em] text-[#a0a8b8]">
                            <th className="border-b border-gray-200 pb-4 pr-6">Survey</th>
                            <th className="border-b border-gray-200 pb-4 pr-6">Completed</th>
                            <th className="border-b border-gray-200 pb-4 pr-6">Credits</th>
                            <th className="border-b border-gray-200 pb-4">Score / Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {completedSurveys.map((completion) => (
                            <tr key={`${completion.surveyId}-${completion.completedAt}`}>
                              <td className="border-b border-gray-100 py-6 pr-6 align-top">
                                <p className="text-[16px] font-semibold text-[#374151]">{completion.surveyName}</p>
                                <p className="mt-1 max-w-md text-sm leading-6 text-[#8a94a6]">{completion.summary}</p>
                              </td>
                              <td className="border-b border-gray-100 py-6 pr-6 align-top text-[15px] text-[#667085]">
                                <p>{formatCompletedDate(completion.completedAt)}</p>
                                <p className="mt-1 text-sm text-[#98a2b3]">{formatDuration(completion.durationSeconds)}</p>
                              </td>
                              <td className="border-b border-gray-100 py-6 pr-6 align-top text-[15px] font-semibold text-[#6d3fd1]">
                                {completion.earnedCredits}
                              </td>
                              <td className="border-b border-gray-100 py-6 align-top text-[15px] font-semibold text-[#374151]">
                                {getCompletionScoreLabel(completion)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex min-h-[220px] items-center justify-center rounded-2xl bg-[#faf8ff] text-center">
                      <div>
                        <p className="text-[18px] font-semibold text-[#4f2a78]">No completed surveys yet</p>
                        <p className="mt-2 text-[15px] text-[#8a94a6]">Once you complete surveys, credits and survey scores will appear here.</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            ) : activeSection === "rewards" ? (
              <section className="max-w-5xl space-y-6">
                <div>
                  <h1 className={sectionTitleClassName}>Rewards</h1>
                  <p className="mt-3 text-[15px] uppercase tracking-[0.18em] text-[#8a94a6]">Redeem credits through reward partners</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-[#d9c7ff] bg-[#faf7ff] p-5 shadow-sm">
                    <p className="text-sm font-medium text-[#8a94a6]">Available credit</p>
                    <p className="mt-2 text-[34px] font-bold tracking-[-0.03em] text-[#4f2a78]">{totalCredits}</p>
                    <p className="mt-2 text-sm text-[#667085]">
                      Earned {totalEarnedCredits}, redeemed {redeemedCredits}, remaining available for
                      new rewards.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-[#e9ddff] bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-[#8a94a6]">Current trust score</p>
                    <p className="mt-2 text-[34px] font-bold tracking-[-0.03em] text-[#4f2a78]">{trustScoreDisplay}</p>
                    <p className="mt-2 text-sm text-[#667085]">
                      {trustScore === null && hasWelcomeCompletion
                        ? "Your trust score starts after your first matched research survey."
                        : "Higher trust scores move your survey rewards closer to the top of the 20-70 credit range."}
                    </p>
                  </div>
                </div>

                {rewardError ? (
                  <div className="rounded-[24px] border border-[#fecaca] bg-[#fff5f5] p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-[#fee2e2] p-3">
                        <AlertCircle className="h-5 w-5 text-[#dc2626]" />
                      </div>
                      <div>
                        <h2 className="text-[18px] font-semibold text-[#991b1b]">Reward issue</h2>
                        <p className="mt-1 text-sm leading-7 text-[#7f1d1d]">{rewardError}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {rewardNotice ? (
                  <div className="rounded-[24px] border border-[#d9c7ff] bg-[#faf7ff] p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-[#efe7ff] p-3">
                        <CheckCircle2 className="h-5 w-5 text-[#7c3aed]" />
                      </div>
                      <div>
                        <h2 className="text-[18px] font-semibold text-[#4f2a78]">Reward activated</h2>
                        <p className="mt-1 text-sm leading-7 text-[#667085]">{rewardNotice}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-8">
                  {rewardsByCategory.map((category) => (
                    <div key={category.id} className="space-y-4">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <h2 className="text-[22px] font-bold tracking-[-0.03em] text-[#1f2937]">{category.label}</h2>
                          <p className="mt-1 text-sm text-[#8a94a6]">
                            {category.rewards.length} reward{category.rewards.length === 1 ? "" : "s"} available in this category
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {category.rewards.map((reward) => (
                          <div
                            key={reward.id}
                            className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)]"
                          >
                            <div
                              className={`flex h-16 w-16 items-center justify-center rounded-[22px] border border-gray-200 p-3 shadow-sm ${
                                reward.logoBackgroundClassName ?? "bg-white"
                              }`}
                            >
                              {reward.logoSrc ? (
                                <ImageWithFallback
                                  src={reward.logoSrc}
                                  fallbackSrc={buildRewardLogoFallbackDataUri(reward)}
                                  alt={reward.logoAlt ?? `${reward.company} logo`}
                                  className="h-full w-full object-contain"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-xl font-bold text-white">{reward.mark ?? reward.company.charAt(0)}</span>
                              )}
                            </div>
                            <h3 className="mt-5 text-[22px] font-bold tracking-[-0.03em] text-[#1f2937]">{reward.company}</h3>
                            <p className="mt-2 min-h-[48px] text-[15px] text-[#8a94a6]">{reward.subtitle}</p>
                            <p className="mt-5 text-sm font-medium text-[#8a94a6]">Required credits</p>
                            <p className="mt-1 text-[28px] font-bold text-[#4f2a78]">{reward.credits}</p>

                            <button
                              type="button"
                              onClick={() => handleActivateReward(reward)}
                              disabled={isActivatingRewardId === reward.id}
                              className="mt-6 w-full rounded-full bg-[linear-gradient(135deg,#6d3fd1_0%,#8b5cf6_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(124,58,237,0.22)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isActivatingRewardId === reward.id
                                ? "Activating..."
                                : activatedRewardId === reward.id
                                  ? "Activated"
                                  : "Activate Reward"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section className="max-w-5xl space-y-8">
                <div>
                  <h1 className={sectionTitleClassName}>Account Settings</h1>
                  <p className={`mt-3 text-[17px] ${settingsBodyTextClassName}`}>
                    Manage your community profile and account security.
                  </p>
                </div>

                <form onSubmit={handleSettingsSubmit} className={settingsFormClassName}>
                  <div className="space-y-8">
                    <div>
                      <h2 className={`text-[22px] font-semibold ${isSettingsDark ? "text-white" : "text-[#111827]"}`}>Profile</h2>
                      <div className="mt-5 space-y-5">
                        <ProfileAvatarPicker
                          role="community"
                          value={{
                            avatarMode: settingsForm.avatarMode,
                            avatarPreset: settingsForm.avatarPreset,
                            avatarCustomDataUrl: settingsForm.avatarCustomDataUrl
                          }}
                          onChange={handleAvatarChange}
                          onError={setSettingsError}
                          onClearError={() => setSettingsError("")}
                          isDark={isSettingsDark}
                        />

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                          <label className="block">
                            <span className={settingsLabelClassName}>
                              <User className="h-4 w-4 text-[#7c3aed]" />
                              Name
                            </span>
                            <input
                              type="text"
                              value={settingsForm.firstName}
                              onChange={(event) => handleSettingsChange("firstName", event.target.value)}
                              className={settingsInputClassName}
                            />
                          </label>

                          <label className="block">
                            <span className={settingsLabelClassName}>
                              <User className="h-4 w-4 text-[#7c3aed]" />
                              Surname
                            </span>
                            <input
                              type="text"
                              value={settingsForm.lastName}
                              onChange={(event) => handleSettingsChange("lastName", event.target.value)}
                              className={settingsInputClassName}
                            />
                          </label>

                          <label className="block md:col-span-2">
                            <span className={settingsLabelClassName}>
                              <Mail className="h-4 w-4 text-[#7c3aed]" />
                              Email
                            </span>
                            <input
                              type="email"
                              value={settingsForm.email}
                              onChange={(event) => handleSettingsChange("email", event.target.value)}
                              className={settingsInputClassName}
                            />
                          </label>

                          <label className="block md:col-span-2">
                            <span className={settingsLabelClassName}>
                              <Phone className="h-4 w-4 text-[#7c3aed]" />
                              Phone number
                            </span>
                            <input
                              type="tel"
                              value={settingsForm.phone}
                              onChange={(event) => handleSettingsChange("phone", event.target.value)}
                              className={settingsInputClassName}
                              placeholder="+994501234567"
                            />
                            <p className={`mt-2 text-sm ${settingsMutedTextClassName}`}>
                              Use international format if you want to receive new survey alerts from our Telegram bot.
                            </p>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div className={settingsSecurityCardClassName}>
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                              isSettingsDark ? "bg-[#302345]" : "bg-[#f1ebff]"
                            }`}
                          >
                            <Shield className="h-5 w-5 text-[#7c3aed]" />
                          </div>
                          <div>
                            <h3 className={`text-[20px] font-semibold ${isSettingsDark ? "text-white" : "text-[#111827]"}`}>
                              Security
                            </h3>
                            <p className={`mt-1 text-[15px] ${settingsMutedTextClassName}`}>Keep your account extra secure.</p>
                          </div>
                        </div>

                        <div className="mt-6 space-y-4">
                          <label className="block">
                            <span className={settingsLabelClassName}>
                              <Lock className="h-4 w-4 text-[#7c3aed]" />
                              New Password
                            </span>
                            <PasswordInput
                              value={securityForm.newPassword}
                              onChange={(event) => handleSecurityChange("newPassword", event.target.value)}
                              className={settingsInputClassName}
                              buttonClassName={isSettingsDark ? "text-[#9d8bb2] hover:text-white" : "text-slate-400 hover:text-slate-600"}
                            />
                          </label>

                          <label className="block">
                            <span className={settingsLabelClassName}>
                              <Lock className="h-4 w-4 text-[#7c3aed]" />
                              Confirm Password
                            </span>
                            <PasswordInput
                              value={securityForm.confirmPassword}
                              onChange={(event) => handleSecurityChange("confirmPassword", event.target.value)}
                              className={settingsInputClassName}
                              buttonClassName={isSettingsDark ? "text-[#9d8bb2] hover:text-white" : "text-slate-400 hover:text-slate-600"}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className={settingsCardClassName}>
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                            isSettingsDark ? "bg-[#302345]" : "bg-[#f1ebff]"
                          }`}
                        >
                          <Send className="h-5 w-5 text-[#7c3aed]" />
                        </div>
                        <div>
                          <h3 className={`text-[20px] font-semibold ${isSettingsDark ? "text-white" : "text-[#111827]"}`}>
                            Telegram Notifications
                          </h3>
                          <p className={`mt-1 text-[15px] ${settingsMutedTextClassName}`}>
                            Send new survey alerts to your Telegram chat after you verify the same phone number you saved here.
                          </p>
                        </div>
                      </div>

                      <div
                        className={`mt-6 rounded-2xl border px-5 py-4 ${
                          telegramStatus?.linked
                            ? isSettingsDark
                              ? "border-[#4b2e72] bg-[#221731]"
                              : "border-[#d6c1ff] bg-[#f7f1ff]"
                            : isSettingsDark
                              ? "border-[#433154] bg-[#160f1f]"
                              : "border-[#eadff9] bg-white"
                        }`}
                      >
                        {isLoadingTelegramStatus ? (
                          <p className={`text-sm ${settingsMutedTextClassName}`}>
                            Checking Telegram status...
                          </p>
                        ) : telegramStatus?.linked ? (
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#7c3aed]" />
                            <div>
                              <p className={`text-sm font-semibold ${isSettingsDark ? "text-white" : "text-[#111827]"}`}>
                                Telegram alerts are active
                                {telegramStatus.telegramUsername
                                  ? ` for @${telegramStatus.telegramUsername}`
                                  : "."}
                              </p>
                              <p className={`mt-1 text-sm ${settingsMutedTextClassName}`}>
                                Linked {formatTelegramLinkedAt(telegramStatus.linkedAt)}.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 text-[#7c3aed]" />
                            <div>
                              <p className={`text-sm font-semibold ${isSettingsDark ? "text-white" : "text-[#111827]"}`}>
                                Telegram is not connected yet
                              </p>
                              <p className={`mt-1 text-sm ${settingsMutedTextClassName}`}>
                                Activate it once and we will use the bot for new survey notifications.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 space-y-2">
                        {hasUnsavedPhoneChange ? (
                          <p className={`text-sm ${settingsMutedTextClassName}`}>
                            Save your phone number changes first, then activate Telegram with the updated number.
                          </p>
                        ) : !savedSettings.phone.trim() ? (
                          <p className={`text-sm ${settingsMutedTextClassName}`}>
                            Add a phone number above to activate Telegram notifications.
                          </p>
                        ) : !isLikelyInternationalPhoneNumber(savedSettings.phone) ? (
                          <p className={`text-sm ${settingsMutedTextClassName}`}>
                            Telegram verification works best with an international number format like +994501234567.
                          </p>
                        ) : telegramStatus?.phoneMismatch ? (
                          <p className={`text-sm ${settingsMutedTextClassName}`}>
                            Your phone number changed since the last Telegram verification. Activate Telegram again to keep alerts working.
                          </p>
                        ) : telegramStatus?.botConfigured === false ? (
                          <p className={`text-sm ${settingsMutedTextClassName}`}>
                            {telegramStatus.botConfigurationError ??
                              "Telegram bot configuration is not finished in this deployment yet."}
                          </p>
                        ) : (
                          <p className={`text-sm ${settingsMutedTextClassName}`}>
                            We only use Telegram to notify you when a new survey matches your profile.
                          </p>
                        )}

                        {telegramError ? (
                          <p className="text-sm font-medium text-red-500">{telegramError}</p>
                        ) : null}
                        {telegramMessage ? (
                          <p className="text-sm font-medium text-[#7c3aed]">{telegramMessage}</p>
                        ) : null}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => void handleStartTelegramLink()}
                          disabled={!canActivateTelegram || isDisconnectingTelegram}
                          className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                            canActivateTelegram && !isDisconnectingTelegram
                              ? "bg-[linear-gradient(135deg,#6d3fd1_0%,#8b5cf6_100%)] text-white shadow-[0_18px_35px_rgba(124,58,237,0.18)] hover:opacity-90"
                              : isSettingsDark
                                ? "cursor-not-allowed border border-[#433154] bg-[#160f1f] text-[#8e7fa0]"
                                : "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                          }`}
                        >
                          <Send className="h-4 w-4" />
                          {isStartingTelegramLink
                            ? "Opening Telegram..."
                            : telegramStatus?.linked
                              ? "Reactivate Telegram"
                              : "Activate Telegram"}
                        </button>

                        <button
                          type="button"
                          onClick={() => void refreshTelegramStatus({ preserveMessage: true })}
                          disabled={isLoadingTelegramStatus}
                          className={`inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition ${
                            isSettingsDark
                              ? "border-[#433154] bg-[#160f1f] text-[#ddd2ef] hover:border-[#8b5cf6]"
                              : "border-gray-200 bg-white text-[#4f2a78] hover:border-[#d9c7ff]"
                          }`}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Refresh status
                        </button>

                        {telegramStatus?.linked ? (
                          <button
                            type="button"
                            onClick={() => void handleDisconnectTelegram()}
                            disabled={isDisconnectingTelegram}
                            className={`inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition ${
                              isSettingsDark
                                ? "border-[#5f3140] bg-[#26131b] text-[#f3c6d2] hover:border-[#f08ab2]"
                                : "border-[#f1c8d6] bg-[#fff5f8] text-[#ad2a62] hover:border-[#e89bbc]"
                            }`}
                          >
                            {isDisconnectingTelegram ? "Disconnecting..." : "Disconnect Telegram"}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-6">
                      <div>
                        {settingsError ? <p className="text-sm font-medium text-red-500">{settingsError}</p> : null}
                        {settingsSaved ? <p className="text-sm font-medium text-[#7c3aed]">Changes saved successfully.</p> : null}
                      </div>
                      <button
                        type="submit"
                        disabled={isSavingSettings}
                        className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#6d3fd1_0%,#8b5cf6_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(124,58,237,0.22)] transition hover:opacity-90"
                      >
                        <Sparkles className="h-4 w-4" />
                        {isSavingSettings ? "Saving..." : "Save changes"}
                      </button>
                    </div>
                  </div>
                </form>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
