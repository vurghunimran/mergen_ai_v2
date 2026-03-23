"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Moon,
  type LucideIcon,
  Settings,
  Shield,
  Sparkles,
  Sun,
  TrendingUp,
  User,
  Wallet
} from "lucide-react";
import ImageWithFallback from "@/components/dashboard/ImageWithFallback";
import ProfileAvatarPicker from "@/components/dashboard/ProfileAvatarPicker";
import SiteLogo from "@/components/SiteLogo";
import { buildCommunityAudienceProfile, matchesSurveyAudience } from "@/lib/audience-matching";
import { AVATAR_METADATA_KEYS, getDefaultAvatarSrc, resolveAvatarSrc } from "@/lib/profile-avatars";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { buildPersistedProfilePayload, upsertProfileRecords } from "@/lib/supabase/profile-db";
import type { UserProfile } from "@/lib/supabase/types";
import {
  CLIENT_DASHBOARD_SURVEYS_STORAGE_KEY,
  COMMUNITY_DASHBOARD_PROGRESS_STORAGE_KEY,
  type ClientSurvey,
  type StoredSurveyQuestion
} from "@/lib/dashboard-data";

const navigationItems = [
  { icon: Home, label: "Dashboard", section: "dashboard" },
  { icon: Wallet, label: "Earnings", section: "earnings" },
  { icon: Gift, label: "Rewards", section: "rewards" },
  { icon: Settings, label: "Settings", section: "settings" }
] as const;

type DashboardSection = "dashboard" | "earnings" | "rewards" | "settings" | "take-survey";

type CommunitySettings = {
  firstName: string;
  lastName: string;
  email: string;
  appearance: "light" | "dark";
  twoFactorEnabled: boolean;
  avatarMode: UserProfile["avatarMode"];
  avatarPreset: string;
  avatarCustomDataUrl: string;
};

type RewardItem = {
  id: string;
  company: string;
  mark: string;
  subtitle: string;
  credits: number;
  brandClassName: string;
};

type CommunityCompletion = {
  surveyId: number;
  surveyName: string;
  earnedCredits: number;
  score: number;
  completedAt: string;
};

type CommunityProgress = {
  completions: CommunityCompletion[];
};

type SurveyAnswerValue = string | string[];
type SurveyAnswerMap = Record<string, SurveyAnswerValue>;

function buildInitialSettings(profile: UserProfile): CommunitySettings {
  return {
    firstName: profile.firstName || "Maya",
    lastName: profile.lastName || "Chen",
    email: profile.email,
    appearance: profile.appearance,
    twoFactorEnabled: profile.twoFactorEnabled,
    avatarMode: profile.avatarMode,
    avatarPreset: profile.avatarPreset,
    avatarCustomDataUrl: profile.avatarCustomDataUrl
  };
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

const REWARDS: RewardItem[] = [
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

function estimateSurveyCredits(survey: ClientSurvey) {
  void survey;
  return "30-70";
}

function calculateEarnedCredits(score: number) {
  return Math.max(30, Math.min(70, 30 + Math.round((score / 100) * 40)));
}

function matchesSurveyToMember(survey: ClientSurvey, memberProfile: ReturnType<typeof buildMemberProfile>) {
  return matchesSurveyAudience(survey.audience, memberProfile);
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

export default function CommunityDashboard({ initialProfile }: { initialProfile: UserProfile }) {
  const router = useRouter();
  const supabase = createSupabaseClient();
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
  const [trustScoreOpen, setTrustScoreOpen] = useState(false);
  const [activatedRewardId, setActivatedRewardId] = useState<string | null>(null);
  const [rewardNotice, setRewardNotice] = useState<string | null>(null);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [surveyNotice, setSurveyNotice] = useState<string | null>(null);
  const [completedSurveys, setCompletedSurveys] = useState<CommunityCompletion[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null);
  const [surveyAnswers, setSurveyAnswers] = useState<SurveyAnswerMap>({});
  const [surveyError, setSurveyError] = useState("");
  const memberProfile = useMemo(() => buildMemberProfile(profileSnapshot), [profileSnapshot]);

  useEffect(() => {
    try {
      const storedSurveys = window.localStorage.getItem(CLIENT_DASHBOARD_SURVEYS_STORAGE_KEY);
      const storedProgress = window.localStorage.getItem(COMMUNITY_DASHBOARD_PROGRESS_STORAGE_KEY);

      if (storedSurveys) {
        const parsedSurveys = JSON.parse(storedSurveys) as ClientSurvey[];

        if (Array.isArray(parsedSurveys)) {
          setClientSurveys(parsedSurveys);
        }
      }

      if (storedProgress) {
        const parsedProgress = JSON.parse(storedProgress) as CommunityProgress;

        if (parsedProgress && Array.isArray(parsedProgress.completions)) {
          setCompletedSurveys(parsedProgress.completions);
        }
      }
    } catch {
      setClientSurveys([]);
      setCompletedSurveys([]);
    } finally {
      setHasHydratedData(true);
    }
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

  const totalCredits = completedSurveys.reduce((sum, completion) => sum + completion.earnedCredits, 0);
  const doneSurveyCount = completedSurveys.length;
  const trustScore =
    completedSurveys.length > 0
      ? Math.round(completedSurveys.reduce((sum, completion) => sum + completion.score, 0) / completedSurveys.length)
      : 0;
  const creditsToday = completedSurveys
    .filter((completion) => new Date(completion.completedAt).toDateString() === new Date().toDateString())
    .reduce((sum, completion) => sum + completion.earnedCredits, 0);

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
        title: `${availableSurveys[0].name} is available for your profile`,
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
      email: settingsForm.email.trim().toLowerCase()
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
          phone_number: profileSnapshot.phoneNumber,
          country: profileSnapshot.country,
          age_span: profileSnapshot.ageSpan,
          gender: profileSnapshot.gender,
          salary_range: profileSnapshot.salaryRange,
          educational_level: profileSnapshot.educationalLevel,
          place_of_residence: profileSnapshot.placeOfResidence,
          family_status: profileSnapshot.familyStatus,
          interests: profileSnapshot.interests,
          car_count: profileSnapshot.carCount,
          appearance: nextSettings.appearance,
          two_factor_enabled: nextSettings.twoFactorEnabled,
          [AVATAR_METADATA_KEYS.mode]: nextSettings.avatarMode,
          [AVATAR_METADATA_KEYS.preset]: nextSettings.avatarPreset,
          [AVATAR_METADATA_KEYS.customDataUrl]: nextSettings.avatarCustomDataUrl
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
        appearance: nextSettings.appearance,
        twoFactorEnabled: nextSettings.twoFactorEnabled,
        avatarMode: nextSettings.avatarMode,
        avatarPreset: nextSettings.avatarPreset,
        avatarCustomDataUrl: nextSettings.avatarCustomDataUrl
      };

      await upsertProfileRecords(supabase, nextProfileSnapshot.id, buildPersistedProfilePayload(nextProfileSnapshot));

      setProfileSnapshot(nextProfileSnapshot);
      setSavedSettings(nextSettings);
      setSettingsForm(nextSettings);
      setSecurityForm({
        newPassword: "",
        confirmPassword: ""
      });
      setSettingsSaved(true);
    } catch (error) {
      setSettingsError(getSettingsErrorMessage(error));
    } finally {
      setIsSavingSettings(false);
    }
  }

  function handleActivateReward(reward: RewardItem) {
    setRewardError(null);

    if (totalCredits < reward.credits) {
      setActivatedRewardId(null);
      setRewardNotice(null);
      setRewardError(`Your credit is not enough for ${reward.company}.`);
      return;
    }

    const message = `${reward.company} reward has been sent to ${savedSettings.email}.`;
    setActivatedRewardId(reward.id);
    setRewardNotice(message);
  }

  function handleOpenSurvey(survey: ClientSurvey) {
    const questions = getSurveyQuestions(survey);
    setSelectedSurveyId(survey.id);
    setSurveyAnswers(buildInitialAnswers(questions));
    setSurveyError("");
    setActiveSection("take-survey");
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

  function handleSubmitSurvey() {
    if (!selectedSurvey) {
      return;
    }

    const questions = getSurveyQuestions(selectedSurvey);
    const hasIncompleteAnswer = questions.some((question) => !isAnswerComplete(question, surveyAnswers[question.id]));

    if (hasIncompleteAnswer) {
      setSurveyError("Please answer every question before submitting the survey.");
      return;
    }

    const score = Math.min(100, 78 + Math.round(questions.length * 2.5));
    const earnedCredits = calculateEarnedCredits(score);
    const completion: CommunityCompletion = {
      surveyId: selectedSurvey.id,
      surveyName: selectedSurvey.name,
      earnedCredits,
      score,
      completedAt: new Date().toISOString()
    };

    const nextCompletions = [completion, ...completedSurveys];
    window.localStorage.setItem(
      COMMUNITY_DASHBOARD_PROGRESS_STORAGE_KEY,
      JSON.stringify({ completions: nextCompletions } satisfies CommunityProgress)
    );
    setCompletedSurveys(nextCompletions);

    const nextClientSurveys = clientSurveys.map((survey) =>
      survey.id === selectedSurvey.id
        ? {
            ...survey,
            responses: Math.min(survey.targetResponses, survey.responses + 1)
          }
        : survey
    );
    window.localStorage.setItem(CLIENT_DASHBOARD_SURVEYS_STORAGE_KEY, JSON.stringify(nextClientSurveys));
    setClientSurveys(nextClientSurveys);

    setSurveyNotice(`${selectedSurvey.name} submitted successfully. ${earnedCredits} credits added to your balance from your ${score}% trust score.`);
    setSelectedSurveyId(null);
    setSurveyAnswers({});
    setSurveyError("");
    setActiveSection("earnings");
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
            {activeSection === "dashboard" ? (
              <>
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
                        <p className="text-3xl font-bold text-gray-900">{trustScore}%</p>
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
                                    matched
                                  </span>
                                </div>

                                <p className="max-w-3xl text-[15px] leading-6 text-[#667085]">{survey.description}</p>

                                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
                                  <div>
                                    <p className="text-xs text-gray-500">Region / countries</p>
                                    <p className="font-semibold text-gray-900">
                                      {survey.audience?.countries?.length ? survey.audience.countries.join(", ") : "Open audience"}
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
                                  Open Survey
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
                      <p className="mt-3 text-[16px] text-[#667085]">Answer the full survey and submit it to add credits to your balance.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection("dashboard");
                        setSelectedSurveyId(null);
                        setSurveyError("");
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
                        <p className="mt-1 text-xs text-[#8a94a6]">Final credits depend on your trust score after submission.</p>
                      </div>
                    </div>

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
                        onClick={handleSubmitSurvey}
                        className="rounded-full bg-[linear-gradient(135deg,#6d3fd1_0%,#8b5cf6_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(124,58,237,0.22)] transition hover:opacity-90"
                      >
                        Submit Survey
                      </button>
                    </div>
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
                            <th className="border-b border-gray-200 pb-4">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {completedSurveys.map((completion) => (
                            <tr key={`${completion.surveyId}-${completion.completedAt}`}>
                              <td className="border-b border-gray-100 py-6 pr-6 align-top">
                                <p className="text-[16px] font-semibold text-[#374151]">{completion.surveyName}</p>
                              </td>
                              <td className="border-b border-gray-100 py-6 pr-6 align-top text-[15px] text-[#667085]">
                                {formatCompletedDate(completion.completedAt)}
                              </td>
                              <td className="border-b border-gray-100 py-6 pr-6 align-top text-[15px] font-semibold text-[#6d3fd1]">
                                {completion.earnedCredits}
                              </td>
                              <td className="border-b border-gray-100 py-6 align-top text-[15px] font-semibold text-[#374151]">
                                {completion.score}/100
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
                    <p className="text-sm font-medium text-[#8a94a6]">Total credit</p>
                    <p className="mt-2 text-[34px] font-bold tracking-[-0.03em] text-[#4f2a78]">{totalCredits}</p>
                    <p className="mt-2 text-sm text-[#667085]">Use this balance to decide which rewards you can activate now.</p>
                  </div>

                  <div className="rounded-[24px] border border-[#e9ddff] bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-[#8a94a6]">Current trust score</p>
                    <p className="mt-2 text-[34px] font-bold tracking-[-0.03em] text-[#4f2a78]">{trustScore}%</p>
                    <p className="mt-2 text-sm text-[#667085]">Higher trust scores move your survey rewards closer to the top of the 30-70 credit range.</p>
                  </div>
                </div>

                {rewardError ? (
                  <div className="rounded-[24px] border border-[#fecaca] bg-[#fff5f5] p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-[#fee2e2] p-3">
                        <AlertCircle className="h-5 w-5 text-[#dc2626]" />
                      </div>
                      <div>
                        <h2 className="text-[18px] font-semibold text-[#991b1b]">Not enough credits</h2>
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

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {REWARDS.map((reward) => (
                    <div
                      key={reward.id}
                      className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)]"
                    >
                      <div className={`flex h-14 w-14 items-center justify-center rounded-[20px] text-xl font-bold ${reward.brandClassName}`}>
                        {reward.mark}
                      </div>
                      <h2 className="mt-5 text-[22px] font-bold tracking-[-0.03em] text-[#1f2937]">{reward.company}</h2>
                      <p className="mt-2 text-[15px] text-[#8a94a6]">{reward.subtitle}</p>
                      <p className="mt-5 text-sm font-medium text-[#8a94a6]">Required credits</p>
                      <p className="mt-1 text-[28px] font-bold text-[#4f2a78]">{reward.credits}</p>

                      <button
                        type="button"
                        onClick={() => handleActivateReward(reward)}
                        className="mt-6 w-full rounded-full bg-[linear-gradient(135deg,#6d3fd1_0%,#8b5cf6_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(124,58,237,0.22)] transition hover:opacity-90"
                      >
                        {activatedRewardId === reward.id ? "Activated" : "Activate Reward"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section className="max-w-5xl space-y-8">
                <div>
                  <h1 className={sectionTitleClassName}>Account Settings</h1>
                  <p className={`mt-3 text-[17px] ${settingsBodyTextClassName}`}>
                    Manage your community profile, app preferences, and account security.
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
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <div className={settingsCardClassName}>
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                              isSettingsDark ? "bg-[#302345]" : "bg-[#f1ebff]"
                            }`}
                          >
                            <Sun className="h-5 w-5 text-[#7c3aed]" />
                          </div>
                          <div>
                            <h3 className={`text-[20px] font-semibold ${isSettingsDark ? "text-white" : "text-[#111827]"}`}>
                              App Preferences
                            </h3>
                            <p className={`mt-1 text-[15px] ${settingsBodyTextClassName}`}>Appearance</p>
                            <p className={`mt-1 text-[15px] ${settingsMutedTextClassName}`}>Switch between light and dark themes</p>
                          </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleSettingsChange("appearance", "light")}
                            className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                              settingsForm.appearance === "light"
                                ? "border-[#cbb4ff] bg-white text-[#6d3fd1] shadow-[0_10px_24px_rgba(124,58,237,0.08)]"
                                : isSettingsDark
                                  ? "border-[#433154] bg-[#160f1f] text-[#d5cbc3] hover:border-[#8b5cf6]"
                                  : "border-gray-200 bg-white text-[#6b7280] hover:border-[#d9c7ff]"
                            }`}
                          >
                            <Sun className="h-4 w-4" />
                            Light
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSettingsChange("appearance", "dark")}
                            className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                              settingsForm.appearance === "dark"
                                ? "border-[#8b5cf6] bg-[#160f1f] text-white shadow-[0_10px_24px_rgba(124,58,237,0.15)]"
                                : isSettingsDark
                                  ? "border-[#433154] bg-[#160f1f] text-[#d5cbc3] hover:border-[#8b5cf6]"
                                  : "border-gray-200 bg-white text-[#6b7280] hover:border-[#d9c7ff]"
                            }`}
                          >
                            <Moon className="h-4 w-4" />
                            Dark
                          </button>
                        </div>
                      </div>

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
                            <input
                              type="password"
                              value={securityForm.newPassword}
                              onChange={(event) => handleSecurityChange("newPassword", event.target.value)}
                              className={settingsInputClassName}
                            />
                          </label>

                          <label className="block">
                            <span className={settingsLabelClassName}>
                              <Lock className="h-4 w-4 text-[#7c3aed]" />
                              Confirm Password
                            </span>
                            <input
                              type="password"
                              value={securityForm.confirmPassword}
                              onChange={(event) => handleSecurityChange("confirmPassword", event.target.value)}
                              className={settingsInputClassName}
                            />
                          </label>

                          <div className="flex items-center justify-between rounded-2xl border border-dashed border-[#d9c7ff] px-4 py-3">
                            <div>
                              <p className={`text-sm font-semibold ${isSettingsDark ? "text-white" : "text-[#111827]"}`}>Two-factor Authentication</p>
                              <p className={`mt-1 text-sm ${settingsMutedTextClassName}`}>Keep your account extra secure.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSettingsChange("twoFactorEnabled", !settingsForm.twoFactorEnabled)}
                              className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                                settingsForm.twoFactorEnabled ? "bg-[#7c3aed]" : "bg-gray-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                                  settingsForm.twoFactorEnabled ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
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
