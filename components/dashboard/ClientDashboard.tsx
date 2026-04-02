"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  CheckCircle,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Home,
  Lock,
  Loader2,
  LogOut,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Save,
  Search,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  Users,
  BarChart3
} from "lucide-react";
type DashboardSection = "dashboard" | "active-surveys" | "analytics" | "settings" | "create-survey";
import CreateSurveyFlow from "@/components/dashboard/CreateSurveyFlow";
import ImageWithFallback from "@/components/dashboard/ImageWithFallback";
import ProfileAvatarPicker from "@/components/dashboard/ProfileAvatarPicker";
import SiteLogo from "@/components/SiteLogo";
import PasswordInput from "@/components/ui/password-input";
import { AVATAR_METADATA_KEYS, getDefaultAvatarSrc, resolveAvatarSrc } from "@/lib/profile-avatars";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { buildPersistedProfilePayload, upsertProfileRecords } from "@/lib/supabase/profile-db";
import type { UserProfile } from "@/lib/supabase/types";
import {
  getClientDashboardSettingsStorageKey,
  getClientPendingPolarCheckoutStorageKey,
  getCreateSurveyDraftStorageKey,
  type ClientSurvey,
  type PendingPolarCheckout,
  type SurveyCheckoutPayload
} from "@/lib/dashboard-data";
import type { SurveyReportResponse } from "@/lib/dashboard-data";
import {
  buildQuestionCharts,
  buildRawDataCsv,
  buildResponseTimeline,
  buildSignalHighlights,
  buildTrustDistribution,
  getAverageCompletionMinutes,
  getAverageTrustScore,
  getSurveyCompletionRate,
  getSurveyResponseCount
} from "@/lib/survey-report";

const navigationItems: Array<{
  icon: typeof Home;
  label: string;
  section: Exclude<DashboardSection, "create-survey">;
}> = [
  { icon: Home, label: "Dashboard", section: "dashboard" },
  { icon: ClipboardList, label: "Active Surveys", section: "active-surveys" },
  { icon: BarChart3, label: "Analytics", section: "analytics" },
  { icon: Settings, label: "Settings", section: "settings" }
];

type DashboardSettings = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  appearance: "light" | "dark";
  twoFactorEnabled: boolean;
  avatarMode: UserProfile["avatarMode"];
  avatarPreset: string;
  avatarCustomDataUrl: string;
};

const ACADEMIC_POSITIONS = [
  "Student",
  "Research Assistant",
  "Research Associate",
  "Researcher",
  "Lecturer",
  "Academic",
  "Professor",
  "Research Lead",
  "Department Head"
] as const;

function buildInitialSettings(profile: UserProfile): DashboardSettings {
  return {
    firstName: profile.firstName || "Alex",
    lastName: profile.lastName || "Thompson",
    email: profile.email,
    phone: profile.phoneNumber,
    position: profile.position || "Research Lead",
    appearance: profile.appearance,
    twoFactorEnabled: profile.twoFactorEnabled,
    avatarMode: profile.avatarMode,
    avatarPreset: profile.avatarPreset,
    avatarCustomDataUrl: profile.avatarCustomDataUrl
  };
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
      Pick<DashboardSettings, "avatarMode" | "avatarPreset" | "avatarCustomDataUrl">
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

function getSurveyProgressPercent(survey: ClientSurvey) {
  const targetResponses = Number(survey.targetResponses);
  const responses = Number(survey.responses);

  if (!Number.isFinite(targetResponses) || targetResponses <= 0 || !Number.isFinite(responses) || responses <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (responses / targetResponses) * 100));
}

function buildChartPoints(values: number[], width: number, height: number, padding: number) {
  const safeMax = Math.max(...values, 1);
  const stepX = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = padding + stepX * index;
      const y = height - padding - (value / safeMax) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

function buildChartArea(values: number[], width: number, height: number, padding: number) {
  const points = buildChartPoints(values, width, height, padding);
  const finalX = values.length > 1 ? width - padding : padding;
  return `${padding},${height - padding} ${points} ${finalX},${height - padding}`;
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export default function ClientDashboard({
  initialProfile,
  adminHref
}: {
  initialProfile: UserProfile;
  adminHref?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseClient();
  const dashboardPath = `/dashboard/client/${initialProfile.id}`;
  const clientSettingsStorageKey = getClientDashboardSettingsStorageKey(initialProfile.id);
  const createSurveyDraftStorageKey = getCreateSurveyDraftStorageKey(initialProfile.id);
  const pendingPolarCheckoutStorageKey = getClientPendingPolarCheckoutStorageKey(initialProfile.id);
  const [profileSnapshot, setProfileSnapshot] = useState<UserProfile>(initialProfile);
  const [surveys, setSurveys] = useState<ClientSurvey[]>([]);
  const [savedSettings, setSavedSettings] = useState<DashboardSettings>(() => buildInitialSettings(initialProfile));
  const [settingsForm, setSettingsForm] = useState<DashboardSettings>(() => buildInitialSettings(initialProfile));
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<DashboardSection>("dashboard");
  const [projectSearch, setProjectSearch] = useState("");
  const [hasHydratedData, setHasHydratedData] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [surveyLoadError, setSurveyLoadError] = useState("");
  const [isConfirmingPolarCheckout, setIsConfirmingPolarCheckout] = useState(false);
  const [selectedReportSurveyId, setSelectedReportSurveyId] = useState<number | null>(null);
  const [reportCache, setReportCache] = useState<Record<number, SurveyReportResponse>>({});
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  const [securityForm, setSecurityForm] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const isCreateSurveySection = activeSection === "create-survey";

  useEffect(() => {
    let cancelled = false;

    async function loadSurveys() {
      try {
        setSurveyLoadError("");
        const response = await fetch("/api/surveys", { cache: "no-store" });
        const data = (await response.json().catch(() => ({}))) as { surveys?: ClientSurvey[]; error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Could not load surveys.");
        }

        if (!cancelled) {
          setSurveys(Array.isArray(data.surveys) ? data.surveys : []);
        }
      } catch (error) {
        if (!cancelled) {
          setSurveys([]);
          setSurveyLoadError(error instanceof Error ? error.message : "Could not load surveys.");
        }
      } finally {
        if (!cancelled) {
          setHasHydratedData(true);
        }
      }
    }

    void loadSurveys();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const section = searchParams.get("section");
    const error = searchParams.get("error");

    if (section === "create-survey") {
      setActiveSection("create-survey");
    }

    if (error === "access-denied") {
      setPaymentError("403 Unauthorized. You can only access surveys and dashboards that belong to your account.");
    }
  }, [searchParams]);

  useEffect(() => {
    const localAvatarSettings = readLocalAvatarSettings(clientSettingsStorageKey);

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
  }, [clientSettingsStorageKey]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest("[data-survey-actions]")) {
        setOpenMenuId(null);
      }
      if (!event.target.closest("[data-profile-menu]")) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const recentActivities =
    surveys.length > 0
      ? [
          {
            id: 1,
            icon: CheckCircle,
            message: `${surveys[0]?.name} survey just published`,
            time: "Just now",
            iconColor: "text-emerald-600",
            iconBg: "bg-emerald-50"
          }
        ]
      : [];

  const totalResponses = surveys.reduce((sum, survey) => sum + survey.responses, 0);
  const totalTargetResponses = surveys.reduce((sum, survey) => sum + survey.targetResponses, 0);
  const completionRate = totalTargetResponses > 0 ? Math.round((totalResponses / totalTargetResponses) * 100) : 0;
  const filteredProjects = surveys.filter((survey) => survey.name.toLowerCase().includes(projectSearch.toLowerCase()));
  const totalRawResponses = surveys.reduce((sum, survey) => sum + getSurveyResponseCount(survey), 0);
  const averageTrustScore =
    totalRawResponses > 0
      ? Math.round(surveys.reduce((sum, survey) => sum + getAverageTrustScore(survey) * getSurveyResponseCount(survey), 0) / totalRawResponses)
      : 0;
  const averageResponseTime =
    totalRawResponses > 0
      ? surveys.reduce((sum, survey) => sum + getAverageCompletionMinutes(survey) * getSurveyResponseCount(survey), 0) / totalRawResponses
      : 0;
  const aiTargetedSurveys = surveys.filter((survey) => survey.includeDetailedAI);
  const selectedReportSurvey = surveys.find((survey) => survey.id === selectedReportSurveyId) ?? null;
  const selectedReport = selectedReportSurveyId ? reportCache[selectedReportSurveyId] ?? null : null;
  const selectedReportCharts = selectedReportSurvey ? buildQuestionCharts(selectedReportSurvey) : [];
  const selectedReportTimeline = selectedReportSurvey ? buildResponseTimeline(selectedReportSurvey) : [];
  const selectedReportSignals = selectedReportSurvey ? buildSignalHighlights(selectedReportSurvey) : [];
  const selectedTrustDistribution = selectedReportSurvey ? buildTrustDistribution(selectedReportSurvey) : [];
  const selectedReportAverageTrust = selectedReportSurvey ? getAverageTrustScore(selectedReportSurvey) : 0;
  const selectedReportAverageMinutes = selectedReportSurvey ? getAverageCompletionMinutes(selectedReportSurvey) : 0;
  const selectedReportResponseCount = selectedReportSurvey ? getSurveyResponseCount(selectedReportSurvey) : 0;
  const selectedReportCompletionRate = selectedReportSurvey ? getSurveyCompletionRate(selectedReportSurvey) : 0;
  const selectedTimelineSeries = selectedReportTimeline.map((point) => point.responses);
  const selectedTimelinePoints =
    selectedTimelineSeries.length > 0 ? buildChartPoints(selectedTimelineSeries, 560, 240, 26) : "";
  const selectedTimelineArea =
    selectedTimelineSeries.length > 0 ? buildChartArea(selectedTimelineSeries, 560, 240, 26) : "";
  const engagementSeries =
    surveys.length > 0
      ? [
          Math.max(1, Math.round(totalResponses * 0.08)),
          Math.max(1, Math.round(totalResponses * 0.1)),
          Math.max(1, Math.round(totalResponses * 0.15)),
          Math.max(1, Math.round(totalResponses * 0.45)),
          Math.max(1, Math.round(totalResponses * 0.7)),
          Math.max(1, totalResponses)
        ]
      : [0, 0, 0, 0, 0, 0];
  const chartMonths = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN"];
  const chartPoints = buildChartPoints(engagementSeries, 720, 300, 28);
  const chartArea = buildChartArea(engagementSeries, 720, 300, 28);
  const sectionTitleClassName = "text-[34px] font-bold tracking-[-0.04em] text-[#7c3412]";
  const displayName = `${savedSettings.firstName} ${savedSettings.lastName}`.trim() || "Client account";
  const displayFirstName = savedSettings.firstName.trim() || "Client";
  const displayPosition = savedSettings.position.trim() || "Research Lead";
  const savedAvatarSrc = resolveAvatarSrc({
    role: "client",
    avatarMode: savedSettings.avatarMode,
    avatarPreset: savedSettings.avatarPreset,
    avatarCustomDataUrl: savedSettings.avatarCustomDataUrl
  });
  const isSettingsDark = settingsForm.appearance === "dark";
  const settingsFormClassName = isSettingsDark
    ? "rounded-[28px] border border-[#312922] bg-[linear-gradient(180deg,#231d19_0%,#1a1512_100%)] p-8 text-white shadow-[0_22px_55px_rgba(15,23,42,0.18)]"
    : "rounded-[28px] border border-gray-200 bg-white p-8 shadow-[0_18px_44px_rgba(15,23,42,0.04)]";
  const settingsSecurityCardClassName = isSettingsDark
    ? "rounded-[24px] border border-[#352d27] bg-[#201916] p-6"
    : "rounded-[24px] border border-gray-200 bg-[#fcfcfc] p-6";
  const settingsInputClassName = isSettingsDark
    ? "w-full rounded-2xl border border-[#43372f] bg-[#181311] px-4 py-3.5 text-[16px] text-white outline-none transition placeholder:text-[#7f736a] focus:border-[#ff8a33]"
    : "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none transition focus:border-[#ff6a00]";
  const settingsLabelClassName = isSettingsDark ? "mb-2 flex items-center gap-2 text-sm font-medium text-[#ddd3cb]" : "mb-2 flex items-center gap-2 text-sm font-medium text-[#4b5563]";
  const settingsMutedTextClassName = isSettingsDark ? "text-[#9b8e84]" : "text-[#8a94a6]";
  const settingsBodyTextClassName = isSettingsDark ? "text-[#cfc4bc]" : "text-[#6b7280]";
  const regionRows =
    surveys.length > 0
      ? [
          {
            name: "Asia",
            value: totalResponses
          }
        ]
      : [];

  async function handleDeleteSurvey(surveyId: number) {
    setPaymentError("");
    setPaymentNotice("");
    setOpenMenuId(null);

    try {
      const response = await fetch(`/api/surveys/${surveyId}`, {
        method: "DELETE"
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not archive survey.");
      }

      setSurveys((currentSurveys) => currentSurveys.filter((survey) => survey.id !== surveyId));
      setSelectedReportSurveyId((currentId) => (currentId === surveyId ? null : currentId));
      setPaymentNotice("Survey archived. Member credits and response history were kept in the system.");
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Could not archive survey.");
    }

    setOpenMenuId(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsProfileMenuOpen(false);
    router.push("/auth?type=client");
    router.refresh();
  }

  async function publishSurvey(payload: SurveyCheckoutPayload) {
    setPaymentNotice("");
    setPaymentError("");
    const createResponse = await fetch("/api/surveys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const createData = (await createResponse.json().catch(() => ({}))) as {
      survey?: ClientSurvey;
      error?: string;
    };

    if (!createResponse.ok || !createData.survey) {
      throw new Error(createData.error ?? "Survey could not be created.");
    }

    setSurveys((currentSurveys) => [createData.survey as ClientSurvey, ...currentSurveys]);

    try {
      const response = await fetch("/api/surveys/notify-community", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          surveyId: createData.survey.id
        })
      });

      const data = (await response.json()) as {
        stage?: number;
        matchedRecipients?: number;
        sentEmails?: number;
        sentTelegramMessages?: number;
        error?: string;
      };

      if (!response.ok) {
        return {
          matchedRecipients: 0,
          sentEmails: 0,
          sentTelegramMessages: 0,
          notificationError: data.error ?? "Survey published, but community emails could not be sent."
        };
      }

      return {
        matchedRecipients: data.matchedRecipients ?? 0,
        sentEmails: data.sentEmails ?? 0,
        sentTelegramMessages: data.sentTelegramMessages ?? 0,
        notificationError: ""
      };
    } catch {
      return {
        matchedRecipients: 0,
        sentEmails: 0,
        sentTelegramMessages: 0,
        notificationError: "Survey published, but community emails could not be sent."
      };
    }
  }

  async function handleOpenAiReport(survey: ClientSurvey) {
    if (!survey.includeDetailedAI) {
      setReportError("AI report is only available for surveys that purchased the AI report add-on.");
      return;
    }

    if (!survey.rawResponses?.length) {
      setReportError("Raw data is not available yet for this survey.");
      return;
    }

    setSelectedReportSurveyId(survey.id);
    setReportError("");

    if (reportCache[survey.id]) {
      return;
    }

    setIsGeneratingReport(true);

    try {
      const response = await fetch("/api/survey-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ surveyId: survey.id })
      });

      const report = (await response.json()) as Partial<SurveyReportResponse> & { error?: string };

      if (!response.ok || !report.executiveSummary) {
        throw new Error(report.error ?? "AI report could not be generated.");
      }

      const normalizedReport: SurveyReportResponse = {
        executiveSummary: report.executiveSummary,
        keyInsights: Array.isArray(report.keyInsights) ? report.keyInsights : [],
        futurePredictions: Array.isArray(report.futurePredictions) ? report.futurePredictions : [],
        recommendations: Array.isArray(report.recommendations) ? report.recommendations : [],
        methodologyNote: report.methodologyNote ?? "",
        dataQualityNote: report.dataQualityNote ?? ""
      };

      setReportCache((currentCache) => ({
        ...currentCache,
        [survey.id]: normalizedReport
      }));
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "AI report could not be generated.");
    } finally {
      setIsGeneratingReport(false);
    }
  }

  function handleDownloadRawData(survey: ClientSurvey) {
    if (!survey.rawResponses?.length) {
      setReportError("No raw data is available to download yet.");
      return;
    }

    const filename = `${survey.name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "survey"}-raw-data.csv`;
    downloadTextFile(filename, buildRawDataCsv(survey), "text/csv;charset=utf-8;");
  }

  async function handleStartCheckout(payload: SurveyCheckoutPayload) {
    setPaymentNotice("");
    setPaymentError("");

    window.localStorage.setItem(
      pendingPolarCheckoutStorageKey,
      JSON.stringify({
        payload,
        createdAt: new Date().toISOString()
      } satisfies PendingPolarCheckout)
    );

    const response = await fetch("/api/polar/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        surveyTitle: payload.title,
        questionCount: payload.questionCount,
        respondentCount: payload.targetResponses,
        includeDetailedAI: payload.includeDetailedAI
      })
    });

    const data = (await response.json()) as {
      checkoutUrl?: string;
      error?: string;
    };

    if (!response.ok || !data.checkoutUrl) {
      window.localStorage.removeItem(pendingPolarCheckoutStorageKey);
      throw new Error(data.error ?? "Polar checkout could not be created.");
    }

    return {
      checkoutUrl: data.checkoutUrl
    };
  }

  useEffect(() => {
    if (!hasHydratedData || isConfirmingPolarCheckout) {
      return;
    }

    const paymentStatus = searchParams.get("payment");
    const polarCheckoutId = searchParams.get("polar_checkout_id");

    if (!polarCheckoutId) {
      if (paymentStatus === "cancelled") {
        setPaymentNotice("Polar checkout was cancelled. Your survey draft is still saved.");
        window.history.replaceState(null, "", dashboardPath);
      }
      return;
    }

    let cancelled = false;

    async function finalizePolarCheckout() {
      setIsConfirmingPolarCheckout(true);
      setPaymentError("");
      setPaymentNotice("");

      try {
        const pendingCheckoutRaw = window.localStorage.getItem(pendingPolarCheckoutStorageKey);

        if (!pendingCheckoutRaw) {
          throw new Error("Payment returned from Polar, but no pending survey draft was found on this device.");
        }

        const pendingCheckout = JSON.parse(pendingCheckoutRaw) as PendingPolarCheckout;

        const verificationResponse = await fetch(`/api/polar/checkout/${polarCheckoutId}`);
        const verificationData = (await verificationResponse.json()) as {
          isPaid?: boolean;
          status?: string;
          error?: string;
        };

        if (!verificationResponse.ok) {
          throw new Error(verificationData.error ?? "Could not verify Polar checkout.");
        }

        if (!verificationData.isPaid) {
          throw new Error(
            verificationData.status
              ? `Polar checkout is ${verificationData.status}, not paid yet.`
              : "Polar checkout is not paid yet."
          );
        }

        const launchResult = await publishSurvey(pendingCheckout.payload);

        if (cancelled) {
          return;
        }

        window.localStorage.removeItem(pendingPolarCheckoutStorageKey);
        window.localStorage.removeItem(createSurveyDraftStorageKey);
        setActiveSection("active-surveys");
        setPaymentNotice(
          launchResult.notificationError
            ? `Payment confirmed and survey published. ${launchResult.notificationError}`
            : launchResult.sentEmails > 0 || launchResult.sentTelegramMessages > 0
              ? `Payment confirmed and survey published. ${launchResult.sentEmails} matching community members were emailed${launchResult.sentTelegramMessages > 0 ? ` and ${launchResult.sentTelegramMessages} received Telegram alerts` : ""}.`
              : "Payment confirmed and survey published."
        );
        window.history.replaceState(null, "", dashboardPath);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setPaymentError(error instanceof Error ? error.message : "Polar payment verification failed.");
        window.history.replaceState(null, "", dashboardPath);
      } finally {
        if (!cancelled) {
          setIsConfirmingPolarCheckout(false);
        }
      }
    }

    void finalizePolarCheckout();

    return () => {
      cancelled = true;
    };
  }, [createSurveyDraftStorageKey, dashboardPath, hasHydratedData, isConfirmingPolarCheckout, pendingPolarCheckoutStorageKey, searchParams]);

  function handleSettingsChange<Key extends keyof DashboardSettings>(field: Key, value: DashboardSettings[Key]) {
    setSettingsSaved(false);
    setSettingsError("");
    setSettingsForm((currentSettings) => ({
      ...currentSettings,
      [field]: value
    }));
  }

  function handleAvatarChange(value: Pick<DashboardSettings, "avatarMode" | "avatarPreset" | "avatarCustomDataUrl">) {
    setSettingsSaved(false);
    setSettingsError("");
    setSettingsForm((currentSettings) => ({
      ...currentSettings,
      ...value
    }));
  }

  function handleSecurityChange(field: "newPassword" | "confirmPassword", value: string) {
    setSettingsSaved(false);
    setSettingsError("");
    setSecurityForm((currentSecurity) => ({
      ...currentSecurity,
      [field]: value
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
          role: "client",
          first_name: nextSettings.firstName,
          last_name: nextSettings.lastName,
          phone_number: nextSettings.phone,
          position: nextSettings.position,
          country: profileSnapshot.country,
          educational_institution: profileSnapshot.educationalInstitution,
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
        position: nextSettings.position,
        appearance: nextSettings.appearance,
        twoFactorEnabled: nextSettings.twoFactorEnabled,
        avatarMode: nextSettings.avatarMode,
        avatarPreset: nextSettings.avatarPreset,
        avatarCustomDataUrl: nextSettings.avatarCustomDataUrl
      };

      await upsertProfileRecords(supabase, nextProfileSnapshot.id, buildPersistedProfilePayload(nextProfileSnapshot));

      window.localStorage.setItem(
        clientSettingsStorageKey,
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
    } catch (error) {
      setSettingsError(getSettingsErrorMessage(error));
    } finally {
      setIsSavingSettings(false);
    }
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

          {isCreateSurveySection ? (
            <div className="rounded-2xl border border-[#ffe1ca] bg-[#fff9f4] px-4 py-4 text-sm font-medium text-[#7c3412]">
              Survey Builder
            </div>
          ) : (
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
                        ? "bg-[#fff5ea] text-[#e05600] shadow-[0_12px_28px_rgba(255,122,0,0.12)]"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
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
                className="hidden rounded-full border border-[#ffd7bf] bg-[#fff5ea] px-4 py-2 text-sm font-semibold text-[#c25214] transition hover:border-[#ffc49d] hover:bg-[#fff1e2] sm:inline-flex"
              >
                Admin panel
              </Link>
            ) : null}
            <div className="relative flex items-center space-x-3 border-l border-gray-200 pl-4" data-profile-menu>
              <div className="flex flex-col text-right">
                <span className="text-sm font-medium text-gray-900">{displayName}</span>
                <span className="text-xs text-gray-500">{displayPosition}</span>
              </div>
              <button
                type="button"
                aria-label="Open profile menu"
                onClick={() => setIsProfileMenuOpen((currentOpenState) => !currentOpenState)}
                className="rounded-full transition-opacity hover:opacity-90"
              >
                <ImageWithFallback
                  src={savedAvatarSrc}
                  fallbackSrc={getDefaultAvatarSrc("client")}
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
            {paymentNotice ? (
              <div className="rounded-2xl border border-[#d7eadf] bg-[#f3fbf6] px-5 py-4 text-sm text-[#166534]">
                {paymentNotice}
              </div>
            ) : null}

            {paymentError ? (
              <div className="rounded-2xl border border-[#ffd9bf] bg-[#fff4ea] px-5 py-4 text-sm text-[#c2410c]">
                {paymentError}
              </div>
            ) : null}

            {surveyLoadError ? (
              <div className="rounded-2xl border border-[#ffd9bf] bg-[#fffaf5] px-5 py-4 text-sm text-[#c2410c]">
                {surveyLoadError}
              </div>
            ) : null}

            {isConfirmingPolarCheckout ? (
              <div className="rounded-2xl border border-[#ead9cc] bg-white px-5 py-4 text-sm text-slate-600">
                Verifying Polar payment and publishing your survey...
              </div>
            ) : null}

            {activeSection === "dashboard" ? (
              <>
                <div className="relative mb-8 h-64 overflow-hidden rounded-2xl shadow-lg">
                  <div className="absolute inset-0 bg-[linear-gradient(115deg,#8b2508_0%,#b93708_20%,#ff5a00_50%,#c33909_78%,#ff6f00_100%)]" />
                  <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(102deg,transparent_0%,rgba(255,255,255,0.12)_11%,transparent_18%,transparent_31%,rgba(255,255,255,0.08)_39%,transparent_47%,transparent_58%,rgba(255,255,255,0.12)_67%,transparent_75%,transparent_86%,rgba(255,255,255,0.1)_95%,transparent_100%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,149,57,0.24),transparent_28%)]" />

                  <div className="relative z-10 flex h-full items-center px-8">
                    <div className="text-white">
                      <h1 className="mb-2 text-3xl font-bold">Welcome back, {displayFirstName}! 👋</h1>
                      <p className="text-lg text-orange-100">Empower your research with intelligent survey analytics</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="mb-1 text-sm text-gray-500">Active Surveys</p>
                        <p className="text-3xl font-bold text-gray-900">{surveys.length}</p>
                      </div>
                      <div className="rounded-lg bg-orange-50 p-3">
                        <ClipboardList className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="mb-1 text-sm text-gray-500">Total Responses</p>
                        <p className="text-3xl font-bold text-gray-900">{totalResponses}</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-3">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="mb-1 text-sm text-gray-500">Completion Rate</p>
                        <p className="text-3xl font-bold text-gray-900">{completionRate}%</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-3">
                        <TrendingUp className="h-6 w-6 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className="mb-4 text-xl font-semibold text-gray-900">Quick Actions</h2>
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      type="button"
                      onClick={() => setActiveSection("create-survey")}
                      className="group relative overflow-hidden rounded-2xl p-6 text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(115deg,#8b2508_0%,#b93708_20%,#ff5a00_50%,#c33909_78%,#ff6f00_100%)]" />
                      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(102deg,transparent_0%,rgba(255,255,255,0.12)_11%,transparent_18%,transparent_31%,rgba(255,255,255,0.08)_39%,transparent_47%,transparent_58%,rgba(255,255,255,0.12)_67%,transparent_75%,transparent_86%,rgba(255,255,255,0.1)_95%,transparent_100%)]" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,149,57,0.24),transparent_28%)]" />

                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                            <Plus className="h-6 w-6" />
                          </div>
                          <div className="text-left">
                            <h3 className="text-lg font-semibold">Create Survey</h3>
                            <p className="text-orange-100">Build your academic survey and enrich your research</p>
                          </div>
                        </div>
                        <Sparkles className="h-6 w-6 text-orange-200 transition-colors duration-300 group-hover:text-white" />
                      </div>

                      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/8 blur-2xl transition-all duration-300 group-hover:bg-white/10" />
                      <div className="absolute bottom-0 left-0 h-20 w-20 rounded-full bg-orange-300/20 blur-xl" />
                    </button>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Active Surveys</h2>
                    <button
                      type="button"
                      onClick={() => setActiveSection("active-surveys")}
                      className="text-sm font-medium text-orange-600 hover:text-orange-700"
                    >
                      View All
                    </button>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
                    {surveys.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-gray-500">No active surveys yet. Create your first survey to get started!</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {surveys.map((survey) => {
                          const surveyProgressPercent = getSurveyProgressPercent(survey);
                          const surveyProgressLabel = Math.round(surveyProgressPercent);

                          return (
                            <div key={survey.id} className="p-6 transition-colors duration-200 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="mb-3 flex items-center space-x-3">
                                  <h3 className="font-semibold text-gray-900">{survey.name}</h3>
                                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                    {survey.status}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
                                  <div className="flex items-center space-x-2">
                                    <div className="rounded bg-blue-50 p-1.5">
                                      <Users className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Responses</p>
                                      <p className="font-semibold text-gray-900">
                                        {survey.responses} / {survey.targetResponses}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <div className="rounded bg-emerald-50 p-1.5">
                                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Completion</p>
                                      <p className="font-semibold text-gray-900">{surveyProgressLabel}%</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <div className="rounded bg-orange-50 p-1.5">
                                      <Clock className="h-4 w-4 text-orange-600" />
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Days Left</p>
                                      <p className="font-semibold text-gray-900">{survey.daysRemaining}</p>
                                    </div>
                                  </div>

                                  <div>
                                    <p className="text-xs text-gray-500">Created</p>
                                    <p className="font-medium text-gray-900">{survey.createdDate}</p>
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                                    <span>Progress</span>
                                    <span>{surveyProgressLabel}%</span>
                                  </div>
                                  <div className="h-3 w-full overflow-hidden rounded-full bg-[#eceff4] shadow-inner">
                                    <div
                                      className="h-full rounded-full bg-[linear-gradient(90deg,#ffb066_0%,#fb923c_40%,#f97316_70%,#ea580c_100%)] shadow-[0_0_18px_rgba(249,115,22,0.28)] transition-[width] duration-700 ease-out"
                                      style={{
                                        width: `${surveyProgressPercent}%`,
                                        minWidth: surveyProgressPercent > 0 ? "14px" : "0px"
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <Link
                                    href={`${dashboardPath}/surveys/${survey.id}`}
                                    className="inline-flex items-center rounded-full border border-[#ffd1ad] bg-[#fff7f1] px-4 py-2 text-sm font-semibold text-[#c2410c] transition hover:border-[#ffb57a] hover:bg-[#fff1e7]"
                                  >
                                    Open survey
                                  </Link>
                                </div>
                              </div>

                              <div className="relative" data-survey-actions>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenMenuId((currentOpenMenuId) =>
                                      currentOpenMenuId === survey.id ? null : survey.id
                                    )
                                  }
                                  className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-600"
                                >
                                  <MoreVertical className="h-5 w-5" />
                                </button>

                                {openMenuId === survey.id ? (
                                  <div className="absolute right-0 top-11 z-20 min-w-[180px] rounded-xl border border-gray-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                                    <button
                                      type="button"
                                      onClick={() => void handleDeleteSurvey(survey.id)}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Archive survey
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    {recentActivities.length > 0 ? (
                      <div className="space-y-4">
                        {recentActivities.map((activity) => {
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
                                <p className="font-medium text-gray-900">{activity.message}</p>
                                <div className="mt-1 flex items-center space-x-2">
                                  <Clock className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">{activity.time}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No recent activity yet.</p>
                    )}
                  </div>
                </div>
              </>
            ) : activeSection === "create-survey" ? (
              <CreateSurveyFlow
                userId={initialProfile.id}
                onBackToDashboard={() => setActiveSection("dashboard")}
                onStartCheckout={handleStartCheckout}
              />
            ) : activeSection === "active-surveys" ? (
              <section className="max-w-5xl space-y-6">
                <div className="max-w-xl">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-300" />
                    <input
                      type="text"
                      value={projectSearch}
                      onChange={(event) => setProjectSearch(event.target.value)}
                      placeholder="Search projects..."
                      className="w-full rounded-[24px] border border-gray-200 bg-white py-4 pl-13 pr-5 text-[15px] text-gray-900 shadow-[0_18px_40px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#ff6a00]"
                    />
                  </div>
                </div>

                <div>
                  <h1 className={sectionTitleClassName}>My Projects</h1>
                </div>

                <div className="grid max-w-[920px] gap-5 lg:grid-cols-2">
                  <div className="rounded-[24px] border-2 border-dashed border-[#e5e7eb] bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
                    <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f3f4f6] text-[#9ca3af]">
                        <Plus className="h-8 w-8" />
                      </div>
                      <h2 className="mt-6 text-[24px] font-bold tracking-[-0.03em] text-[#7c3412]">Start New Project</h2>
                      <p className="mt-3 max-w-xs text-[15px] leading-6 text-[#6b7280]">
                        Launch a new AI-powered survey and connect with your audience.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveSection("create-survey")}
                        className="mt-6 rounded-full bg-[linear-gradient(135deg,#ff7a00_0%,#ea5f2d_100%)] px-7 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(255,106,0,0.22)] transition hover:opacity-90"
                      >
                        Create Survey
                      </button>
                    </div>
                  </div>

                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((survey) => (
                      <div
                        key={survey.id}
                        className="overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.05)]"
                      >
                        <div className="relative h-[112px] bg-[linear-gradient(135deg,#ea643a_0%,#e85b34_45%,#d94a23_100%)]">
                          <div className="absolute right-4 top-4 rounded-full bg-[#fff1bc] px-3.5 py-1 text-sm font-bold text-[#9a4c10]">
                            PUBLISHED
                          </div>
                          <div className="flex h-full items-center justify-center text-white/80">
                            <Activity className="h-11 w-11" strokeWidth={1.5} />
                          </div>
                        </div>

                        <div className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h2 className="text-[24px] font-bold tracking-[-0.03em] text-[#7c3412]">{survey.name}</h2>
                              <p className="mt-2.5 max-w-sm text-[15px] leading-6 text-[#667085]">{survey.description}</p>
                              <p className="mt-4 text-[15px] font-medium text-[#667085]">Respondents: {survey.responses}</p>
                              <Link
                                href={`${dashboardPath}/surveys/${survey.id}`}
                                className="mt-5 inline-flex items-center rounded-full border border-[#ffd1ad] bg-[#fff7f1] px-4 py-2 text-sm font-semibold text-[#c2410c] transition hover:border-[#ffb57a] hover:bg-[#fff1e7]"
                              >
                                Open survey
                              </Link>
                            </div>

                            <div className="relative shrink-0" data-survey-actions>
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenMenuId((currentOpenMenuId) =>
                                    currentOpenMenuId === survey.id ? null : survey.id
                                  )
                                }
                                className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                              >
                                <MoreVertical className="h-5 w-5" />
                              </button>

                              {openMenuId === survey.id ? (
                                <div className="absolute right-0 top-11 z-20 min-w-[180px] rounded-xl border border-gray-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteSurvey(survey.id)}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Archive survey
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex min-h-[280px] items-center justify-center rounded-[24px] border border-[#e5e7eb] bg-white p-7 text-center shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
                      <div>
                        <p className="text-lg font-semibold text-[#1f2937]">No matching projects</p>
                        <p className="mt-2 text-[15px] text-[#667085]">Try a different search or create a new survey.</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            ) : activeSection === "analytics" ? (
              <section className="max-w-5xl space-y-6">
                <div>
                  <h1 className={sectionTitleClassName}>Company Analytics Overview</h1>
                  <p className="mt-3 text-[15px] uppercase tracking-[0.18em] text-[#8a94a6]">Real-time insight engine</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#fff5eb]">
                      <Users className="h-7 w-7 text-[#e7692d]" />
                    </div>
                    <p className="mt-6 text-[16px] text-[#7c8699]">Total Respondents</p>
                    <div className="mt-3 flex items-end justify-between gap-4">
                      <p className="text-[38px] font-bold leading-none text-[#111827]">{totalResponses}</p>
                      <span className="flex items-center gap-1 text-[14px] font-semibold text-emerald-500">
                        <TrendingUp className="h-4 w-4" />
                        +0%
                      </span>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#edf3ff]">
                      <CheckCircle className="h-7 w-7 text-[#4f83ff]" />
                    </div>
                    <p className="mt-6 text-[16px] text-[#7c8699]">Average Trust Score</p>
                    <div className="mt-3 flex items-end justify-between gap-4">
                      <p className="text-[38px] font-bold leading-none text-[#111827]">
                        {averageTrustScore}
                        <span className="text-[17px] font-medium text-[#6b7280]">/100</span>
                      </p>
                      <span className="flex items-center gap-1 text-[14px] font-semibold text-emerald-500">
                        <TrendingUp className="h-4 w-4" />
                        +0%
                      </span>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#f3e8ff]">
                      <ClipboardList className="h-7 w-7 text-[#9333ea]" />
                    </div>
                    <p className="mt-6 text-[16px] text-[#7c8699]">Live Surveys</p>
                    <p className="mt-3 text-[38px] font-bold leading-none text-[#111827]">{surveys.length}</p>
                  </div>

                  <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#eafbf2]">
                      <Clock className="h-7 w-7 text-[#10b981]" />
                    </div>
                    <p className="mt-6 text-[16px] text-[#7c8699]">Avg. Response Time</p>
                    <p className="mt-3 text-[38px] font-bold leading-none text-[#111827]">
                      {averageResponseTime.toFixed(1)}
                      <span className="text-[17px] font-medium text-[#6b7280]">m</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,0.95fr)]">
                  <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.04)] sm:p-6">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <h2 className="text-[22px] font-bold tracking-[-0.03em] text-[#1f2937]">Total Survey Engagement</h2>
                      <div className="rounded-xl border border-gray-200 bg-[#faf7f3] px-3.5 py-1.5 text-[14px] font-medium text-[#4b5563]">
                        Last 6 months
                      </div>
                    </div>

                    <div className="relative">
                      <svg viewBox="0 0 720 300" className="h-[260px] w-full" aria-label="Survey engagement chart">
                        {[0, 1, 2, 3].map((lineIndex) => {
                          const y = 52 + lineIndex * 58;
                          return (
                            <line
                              key={lineIndex}
                              x1="28"
                              y1={y}
                              x2="692"
                              y2={y}
                              stroke="#e5e7eb"
                              strokeWidth="1"
                            />
                          );
                        })}
                        <defs>
                          <linearGradient id="mergenAnalyticsFill" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="rgba(255,122,0,0.06)" />
                            <stop offset="100%" stopColor="rgba(255,122,0,0.22)" />
                          </linearGradient>
                        </defs>
                        <polygon points={chartArea} fill="url(#mergenAnalyticsFill)" />
                        <polyline
                          points={chartPoints}
                          fill="none"
                          stroke="#f35b04"
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>

                      <div className="mt-1 grid grid-cols-6 text-[13px] font-medium tracking-[0.08em] text-[#8a94a6]">
                        {chartMonths.map((month) => (
                          <span key={month} className="text-center">
                            {month}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.04)] sm:p-6">
                    <div className="mb-8 flex items-center justify-between gap-4">
                      <h2 className="text-[22px] font-bold tracking-[-0.03em] text-[#1f2937]">Reach by Region</h2>
                      <button type="button" className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </div>

                    {regionRows.length > 0 ? (
                      <div className="space-y-6">
                        {regionRows.map((region) => (
                          <div key={region.name}>
                            <div className="mb-3 flex items-center justify-between text-[16px] font-medium text-[#374151]">
                              <span>{region.name}</span>
                              <span>{region.value}</span>
                            </div>
                            <div className="h-3.5 rounded-full bg-[#fff1e5]">
                              <div
                                className="h-3.5 rounded-full bg-[linear-gradient(90deg,#ff6a00_0%,#f35b04_100%)]"
                                style={{ width: `${Math.min(100, (region.value / Math.max(totalResponses, 1)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex min-h-[220px] items-center justify-center rounded-2xl bg-[#fafafa] text-center">
                        <p className="text-[16px] text-[#8a94a6]">No regional data yet.</p>
                      </div>
                    )}
                  </div>
                </div>

                {reportError ? (
                  <div className="rounded-[24px] border border-[#ffd9bf] bg-[#fff4ea] p-5 text-sm text-[#c2410c] shadow-sm">
                    {reportError}
                  </div>
                ) : null}

                {selectedReportSurvey ? (
                  <div className="space-y-5 rounded-[28px] border border-[#eadfce] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] p-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)] sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c56b36]">AI Report</p>
                        <h2 className="mt-2 text-[28px] font-bold tracking-[-0.03em] text-[#1f2937]">{selectedReportSurvey.name}</h2>
                        <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#667085]">
                          {selectedReport?.executiveSummary ?? "Generating AI report..."}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleDownloadRawData(selectedReportSurvey)}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#4b5563] transition hover:border-[#ffd1ad] hover:text-[#d85d1c]"
                        >
                          <Download className="h-4 w-4" />
                          Download Raw Data
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedReportSurveyId(null)}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#4b5563] transition hover:border-[#ffd1ad] hover:text-[#d85d1c]"
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-[24px] border border-gray-200 bg-white p-5">
                        <p className="text-sm font-medium text-[#8a94a6]">Validated responses</p>
                        <p className="mt-3 text-[34px] font-bold text-[#111827]">{selectedReportResponseCount}</p>
                      </div>
                      <div className="rounded-[24px] border border-gray-200 bg-white p-5">
                        <p className="text-sm font-medium text-[#8a94a6]">Average trust</p>
                        <p className="mt-3 text-[34px] font-bold text-[#111827]">{selectedReportAverageTrust}/100</p>
                      </div>
                      <div className="rounded-[24px] border border-gray-200 bg-white p-5">
                        <p className="text-sm font-medium text-[#8a94a6]">Avg. completion time</p>
                        <p className="mt-3 text-[34px] font-bold text-[#111827]">{selectedReportAverageMinutes.toFixed(1)}m</p>
                      </div>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
                      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
                        <div className="rounded-[24px] border border-gray-200 bg-white p-5">
                          <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-[#fff4ea] p-3 text-[#ea5f2d]">
                              <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#8a94a6]">Target completion</p>
                              <p className="text-[18px] font-semibold text-[#1f2937]">
                                {selectedReportResponseCount} of {selectedReportSurvey.targetResponses}
                              </p>
                            </div>
                          </div>
                          <div className="mt-6 flex justify-center">
                            <div
                              className="flex h-32 w-32 items-center justify-center rounded-full"
                              style={{
                                background: `conic-gradient(#f35b04 0deg ${selectedReportCompletionRate * 3.6}deg, #fff1e5 ${selectedReportCompletionRate * 3.6}deg 360deg)`
                              }}
                            >
                              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
                                <span className="text-[28px] font-bold text-[#111827]">{selectedReportCompletionRate}%</span>
                                <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#98a2b3]">Reached</span>
                              </div>
                            </div>
                          </div>
                          <p className="mt-4 text-center text-sm leading-6 text-[#667085]">
                            Visual progress against the planned response target for this paid AI survey.
                          </p>
                        </div>

                        <div className="rounded-[24px] border border-gray-200 bg-white p-5">
                          <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-[#eef4ff] p-3 text-[#3563e9]">
                              <Shield className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#8a94a6]">Dataset quality</p>
                              <p className="text-[18px] font-semibold text-[#1f2937]">{selectedReportAverageTrust}/100 trust</p>
                            </div>
                          </div>
                          <div className="mt-6 flex justify-center">
                            <div
                              className="flex h-32 w-32 items-center justify-center rounded-full"
                              style={{
                                background: `conic-gradient(#3563e9 0deg ${selectedReportAverageTrust * 3.6}deg, #e5ecff ${selectedReportAverageTrust * 3.6}deg 360deg)`
                              }}
                            >
                              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
                                <span className="text-[28px] font-bold text-[#111827]">{selectedReportAverageTrust}%</span>
                                <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#98a2b3]">Quality</span>
                              </div>
                            </div>
                          </div>
                          <p className="mt-4 text-center text-sm leading-6 text-[#667085]">
                            Trust score reflects answer consistency, relevance, and completion behavior.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-gray-200 bg-white p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-[20px] font-bold tracking-[-0.03em] text-[#1f2937]">Response timeline</h3>
                            <p className="mt-1 text-sm text-[#8a94a6]">Daily response volume and quality trend from collected raw data.</p>
                          </div>
                          <div className="rounded-full bg-[#f8fafc] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">
                            Last {Math.max(selectedReportTimeline.length, 1)} days
                          </div>
                        </div>

                        {selectedReportTimeline.length > 0 ? (
                          <div className="mt-6">
                            <svg viewBox="0 0 560 240" className="h-[240px] w-full" aria-label="AI report response timeline">
                              {[0, 1, 2, 3].map((lineIndex) => {
                                const y = 40 + lineIndex * 44;
                                return (
                                  <line
                                    key={lineIndex}
                                    x1="26"
                                    y1={y}
                                    x2="534"
                                    y2={y}
                                    stroke="#edf2f7"
                                    strokeWidth="1"
                                  />
                                );
                              })}
                              <defs>
                                <linearGradient id="mergenReportTimelineFill" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="rgba(243,91,4,0.08)" />
                                  <stop offset="100%" stopColor="rgba(53,99,233,0.16)" />
                                </linearGradient>
                              </defs>
                              <polygon points={selectedTimelineArea} fill="url(#mergenReportTimelineFill)" />
                              <polyline
                                points={selectedTimelinePoints}
                                fill="none"
                                stroke="#f35b04"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              {selectedReportTimeline.map((point, index) => {
                                const stepX =
                                  selectedReportTimeline.length > 1 ? (560 - 52) / (selectedReportTimeline.length - 1) : 0;
                                const maxValue = Math.max(...selectedTimelineSeries, 1);
                                const x = 26 + stepX * index;
                                const y = 240 - 26 - (point.responses / maxValue) * (240 - 52);

                                return (
                                  <g key={`${point.label}-${index}`}>
                                    <circle cx={x} cy={y} r="5" fill="#3563e9" />
                                    <text x={x} y={y - 12} textAnchor="middle" fontSize="11" fill="#64748b">
                                      {point.averageTrust}%
                                    </text>
                                  </g>
                                );
                              })}
                            </svg>

                            <div className="mt-2 grid text-center text-xs font-semibold uppercase tracking-[0.08em] text-[#98a2b3]" style={{ gridTemplateColumns: `repeat(${selectedReportTimeline.length}, minmax(0, 1fr))` }}>
                              {selectedReportTimeline.map((point) => (
                                <span key={point.label}>{point.label}</span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-6 flex min-h-[220px] items-center justify-center rounded-2xl bg-[#fafafa] text-center text-sm text-[#8a94a6]">
                            Timeline visuals will appear after more validated responses are collected.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="rounded-[24px] border border-gray-200 bg-white p-5">
                        <h3 className="text-[20px] font-bold tracking-[-0.03em] text-[#1f2937]">Trust distribution</h3>
                        <div className="mt-5 space-y-4">
                          {selectedTrustDistribution.map((bucket) => (
                            <div key={bucket.label}>
                              <div className="mb-2 flex items-center justify-between text-sm font-medium text-[#4b5563]">
                                <span>{bucket.label}</span>
                                <span>{bucket.value}</span>
                              </div>
                              <div className="h-3 rounded-full bg-[#fff1e5]">
                                <div
                                  className="h-3 rounded-full bg-[linear-gradient(90deg,#ff7a00_0%,#f35b04_100%)]"
                                  style={{
                                    width: `${Math.min(100, (bucket.value / Math.max(selectedReportResponseCount, 1)) * 100)}%`
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-gray-200 bg-white p-5">
                        <h3 className="text-[20px] font-bold tracking-[-0.03em] text-[#1f2937]">Report notes</h3>
                        <div className="mt-5 space-y-4 text-sm leading-7 text-[#667085]">
                          <p>{selectedReport?.dataQualityNote ?? "Evaluating data quality..."}</p>
                          <p>{selectedReport?.methodologyNote ?? "Preparing methodology note..."}</p>
                        </div>
                      </div>
                    </div>

                    {selectedReportSignals.length > 0 ? (
                      <div className="grid gap-5 xl:grid-cols-3">
                        {selectedReportSignals.map((signal) => (
                          <div key={signal.questionId} className="rounded-[24px] border border-gray-200 bg-white p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c56b36]">Signal spotlight</p>
                            <h3 className="mt-2 text-[18px] font-semibold leading-7 text-[#1f2937]">{signal.questionText}</h3>
                            <div className="mt-5 rounded-2xl bg-[#fff7ef] p-4">
                              <p className="text-sm font-medium text-[#8a94a6]">Dominant answer</p>
                              <p className="mt-2 text-base font-semibold text-[#1f2937]">{signal.answerLabel}</p>
                              <div className="mt-4 h-3 rounded-full bg-white">
                                <div
                                  className="h-3 rounded-full bg-[linear-gradient(90deg,#f35b04_0%,#ea643a_100%)]"
                                  style={{ width: `${signal.share}%` }}
                                />
                              </div>
                              <div className="mt-3 flex items-center justify-between text-sm text-[#667085]">
                                <span>{signal.count} responses</span>
                                <span>{signal.share}% share</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {selectedReportCharts.length > 0 ? (
                      <div className="grid gap-5 lg:grid-cols-2">
                        {selectedReportCharts.map((chart) => (
                          <div key={chart.questionId} className="rounded-[24px] border border-gray-200 bg-white p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c56b36]">{chart.questionType}</p>
                            <h3 className="mt-2 text-[18px] font-semibold leading-7 text-[#1f2937]">{chart.questionText}</h3>
                            <div className="mt-5 space-y-4">
                              {chart.dataPoints.map((point) => (
                                <div key={`${chart.questionId}-${point.label}`}>
                                  <div className="mb-2 flex items-center justify-between gap-4 text-sm font-medium text-[#4b5563]">
                                    <span className="max-w-[75%] truncate">{point.label}</span>
                                    <span>{point.value}</span>
                                  </div>
                                  <div className="h-3 rounded-full bg-[#f5f5f5]">
                                    <div
                                      className="h-3 rounded-full bg-[linear-gradient(90deg,#ea643a_0%,#f35b04_100%)]"
                                      style={{
                                        width: `${Math.min(100, (point.value / Math.max(selectedReportResponseCount, 1)) * 100)}%`
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="grid gap-5 xl:grid-cols-3">
                      <div className="rounded-[24px] border border-gray-200 bg-white p-5 xl:col-span-1">
                        <h3 className="text-[20px] font-bold tracking-[-0.03em] text-[#1f2937]">Key insights</h3>
                        <div className="mt-4 space-y-3">
                          {(selectedReport?.keyInsights ?? []).map((insight) => (
                            <div key={insight} className="rounded-2xl bg-[#fff7ef] px-4 py-3 text-sm leading-7 text-[#5b4636]">
                              {insight}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-gray-200 bg-white p-5 xl:col-span-1">
                        <h3 className="text-[20px] font-bold tracking-[-0.03em] text-[#1f2937]">Future prediction</h3>
                        <div className="mt-4 space-y-3">
                          {(selectedReport?.futurePredictions ?? []).map((prediction) => (
                            <div key={prediction} className="rounded-2xl bg-[#f5f9ff] px-4 py-3 text-sm leading-7 text-[#43526b]">
                              {prediction}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-gray-200 bg-white p-5 xl:col-span-1">
                        <h3 className="text-[20px] font-bold tracking-[-0.03em] text-[#1f2937]">Recommended next steps</h3>
                        <div className="mt-4 space-y-3">
                          {(selectedReport?.recommendations ?? []).map((recommendation) => (
                            <div key={recommendation} className="rounded-2xl bg-[#f6fbf6] px-4 py-3 text-sm leading-7 text-[#44584a]">
                              {recommendation}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.04)] sm:p-6">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <h2 className="text-[22px] font-bold tracking-[-0.03em] text-[#1f2937]">Recent AI-Targeted Surveys</h2>
                    <button
                      type="button"
                      onClick={() => setActiveSection("active-surveys")}
                      className="text-[15px] font-semibold text-[#f35b04] transition hover:text-[#d84f03]"
                    >
                      View All
                    </button>
                  </div>

                  {aiTargetedSurveys.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-separate border-spacing-0">
                        <thead>
                          <tr className="text-left text-[13px] font-semibold uppercase tracking-[0.08em] text-[#a0a8b8]">
                            <th className="border-b border-gray-200 pb-4 pr-6">Survey Title</th>
                            <th className="border-b border-gray-200 pb-4 pr-6">Audience Group</th>
                            <th className="border-b border-gray-200 pb-4 pr-6">Status</th>
                            <th className="border-b border-gray-200 pb-4 pr-6">Responses</th>
                            <th className="border-b border-gray-200 pb-4 pr-6">Sentiment</th>
                            <th className="border-b border-gray-200 pb-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aiTargetedSurveys.map((survey) => (
                            <tr key={survey.id}>
                              <td className="border-b border-gray-100 py-6 pr-6 align-top">
                                <div>
                                  <p className="text-[17px] font-semibold text-[#374151]">{survey.name}</p>
                                  <p className="mt-1 text-[14px] text-[#8a94a6]">
                                    ID: SUR-{String(survey.id).padStart(4, "0")}
                                  </p>
                                </div>
                              </td>
                              <td className="border-b border-gray-100 py-6 pr-6 align-top">
                                <span className="inline-flex rounded-2xl bg-[#e7edff] px-3.5 py-2.5 text-[13px] font-medium text-[#64748b]">
                                  Women in Education
                                </span>
                              </td>
                              <td className="border-b border-gray-100 py-6 pr-6 align-top">
                                <span className="inline-flex items-center gap-2 text-[15px] font-medium text-[#4b5563]">
                                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                                  published
                                </span>
                              </td>
                              <td className="border-b border-gray-100 py-6 pr-6 align-top text-[15px] font-medium text-[#4b5563]">
                                {survey.responses} / {survey.targetResponses}
                              </td>
                              <td className="border-b border-gray-100 py-6 pr-6 align-top text-[15px] font-medium text-[#667085]">
                                Live
                              </td>
                              <td className="border-b border-gray-100 py-6 align-top">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void handleOpenAiReport(survey)}
                                    disabled={isGeneratingReport || !survey.rawResponses?.length}
                                    className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff7a00_0%,#ea5f2d_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(234,95,45,0.2)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isGeneratingReport && selectedReportSurveyId === survey.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <FileText className="h-4 w-4" />
                                    )}
                                    AI REPORT
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadRawData(survey)}
                                    disabled={!survey.rawResponses?.length}
                                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#4b5563] transition hover:border-[#ffd1ad] hover:text-[#d85d1c] disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Download className="h-4 w-4" />
                                    Download Raw Data
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex min-h-[180px] items-center justify-center rounded-2xl bg-[#fafafa] text-center">
                      <p className="text-[16px] text-[#8a94a6]">No paid AI-report surveys are available yet.</p>
                    </div>
                  )}
                </div>
              </section>
            ) : activeSection === "settings" ? (
              <section className="max-w-5xl space-y-8">
                <div>
                  <h1 className={sectionTitleClassName}>Account Settings</h1>
                  <p className={`mt-3 text-[17px] ${settingsBodyTextClassName}`}>
                    Manage your profile and account security.
                  </p>
                </div>

                <form onSubmit={handleSettingsSubmit} className={settingsFormClassName}>
                  <div className="space-y-8">
                    <div>
                      <h2 className={`text-[22px] font-semibold ${isSettingsDark ? "text-white" : "text-[#111827]"}`}>Profile</h2>
                      <div className="mt-5 space-y-5">
                        <ProfileAvatarPicker
                          role="client"
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
                              <User className="h-4 w-4 text-[#f35b04]" />
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
                              <User className="h-4 w-4 text-[#f35b04]" />
                              Surname
                            </span>
                            <input
                              type="text"
                              value={settingsForm.lastName}
                              onChange={(event) => handleSettingsChange("lastName", event.target.value)}
                              className={settingsInputClassName}
                            />
                          </label>

                          <label className="block">
                            <span className={settingsLabelClassName}>
                              <Mail className="h-4 w-4 text-[#f35b04]" />
                              Email
                            </span>
                            <input
                              type="email"
                              value={settingsForm.email}
                              onChange={(event) => handleSettingsChange("email", event.target.value)}
                              className={settingsInputClassName}
                            />
                          </label>

                          <label className="block">
                            <span className={settingsLabelClassName}>
                              <Phone className="h-4 w-4 text-[#f35b04]" />
                              Phone
                            </span>
                            <input
                              type="tel"
                              value={settingsForm.phone}
                              onChange={(event) => handleSettingsChange("phone", event.target.value)}
                              className={settingsInputClassName}
                            />
                          </label>

                          <label className="block md:col-span-2">
                            <span className={settingsLabelClassName}>
                              <ClipboardList className="h-4 w-4 text-[#f35b04]" />
                              Position
                            </span>
                            <select
                              value={settingsForm.position}
                              onChange={(event) => handleSettingsChange("position", event.target.value)}
                              className={settingsInputClassName}
                            >
                              {ACADEMIC_POSITIONS.map((position) => (
                                <option key={position} value={position} className="text-gray-900">
                                  {position}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div className={settingsSecurityCardClassName}>
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                              isSettingsDark ? "bg-[#1d2732]" : "bg-[#eef6ff]"
                            }`}
                          >
                            <Shield className="h-5 w-5 text-[#4f83ff]" />
                          </div>
                          <div>
                            <h3 className={`text-[20px] font-semibold ${isSettingsDark ? "text-white" : "text-[#111827]"}`}>Security</h3>
                            <p className={`mt-1 text-[15px] ${settingsMutedTextClassName}`}>Keep your account extra secure.</p>
                          </div>
                        </div>

                        <div className="mt-6 space-y-4">
                          <label className="block">
                            <span className={settingsLabelClassName}>
                              <Lock className="h-4 w-4 text-[#f35b04]" />
                              New Password
                            </span>
                            <PasswordInput
                              value={securityForm.newPassword}
                              onChange={(event) => handleSecurityChange("newPassword", event.target.value)}
                              className={settingsInputClassName}
                              buttonClassName={isSettingsDark ? "text-[#8f837a] hover:text-white" : "text-slate-400 hover:text-slate-600"}
                            />
                          </label>

                          <label className="block">
                            <span className={settingsLabelClassName}>
                              <Lock className="h-4 w-4 text-[#f35b04]" />
                              Confirm Password
                            </span>
                            <PasswordInput
                              value={securityForm.confirmPassword}
                              onChange={(event) => handleSecurityChange("confirmPassword", event.target.value)}
                              className={settingsInputClassName}
                              buttonClassName={isSettingsDark ? "text-[#8f837a] hover:text-white" : "text-slate-400 hover:text-slate-600"}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`mt-8 flex items-center justify-between gap-4 border-t pt-6 ${
                      isSettingsDark ? "border-[#312922]" : "border-gray-100"
                    }`}
                  >
                    <p className={`text-sm ${settingsError ? "text-red-500" : "text-[#8a94a6]"}`}>
                      {settingsError || (settingsSaved ? "Changes saved." : "Update your details and save.")}
                    </p>
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff7a00_0%,#ea5f2d_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(255,106,0,0.22)] transition hover:opacity-90"
                    >
                      <Save className="h-4 w-4" />
                      {isSavingSettings ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              </section>
            ) : (
              <div className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
                <p className="text-lg text-gray-500">This section is not available in the preview yet.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
