"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  CheckCircle,
  ClipboardList,
  Clock,
  Home,
  Lock,
  LogOut,
  Mail,
  Moon,
  MoreVertical,
  Phone,
  Plus,
  Save,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
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
import { AVATAR_METADATA_KEYS, getDefaultAvatarSrc, resolveAvatarSrc } from "@/lib/profile-avatars";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { buildPersistedProfilePayload, upsertProfileRecords } from "@/lib/supabase/profile-db";
import type { UserProfile } from "@/lib/supabase/types";
import {
  CLIENT_PENDING_POLAR_CHECKOUT_STORAGE_KEY,
  CREATE_SURVEY_DRAFT_STORAGE_KEY,
  CLIENT_DASHBOARD_SURVEYS_STORAGE_KEY,
  type ClientSurvey,
  type PendingPolarCheckout,
  type SurveyCheckoutPayload
} from "@/lib/dashboard-data";

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

const INITIAL_SURVEYS = [
  {
    id: 1,
    name: "Women in Education Research in Asia",
    status: "active",
    responses: 20,
    targetResponses: 500,
    daysRemaining: 12,
    createdDate: "Mar 15, 2026",
    description: "Published survey project focused on women in education communities across Asia.",
    questionCount: 10,
    audience: {
      countries: ["India", "Singapore"],
      ageMin: 25,
      ageMax: 55,
      gender: "Female",
      education: "Any education level",
      interests: ["Online learning"],
      researchArea: "Education Science"
    },
    questions: [
      {
        id: "seed-q-1",
        text: "Which factor matters most when choosing an online education platform?",
        type: "Single select",
        options: ["Course quality", "Price", "Certification", "Flexibility"]
      },
      {
        id: "seed-q-2",
        text: "How satisfied are you with the current online learning options available to you?",
        type: "Likert scale",
        options: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]
      },
      {
        id: "seed-q-3",
        text: "What would most improve your online education experience?",
        type: "Open question",
        options: ["Free-text response"]
      }
    ]
  }
] satisfies ClientSurvey[];

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

export default function ClientDashboard({ initialProfile }: { initialProfile: UserProfile }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseClient();
  const [profileSnapshot, setProfileSnapshot] = useState<UserProfile>(initialProfile);
  const [surveys, setSurveys] = useState<ClientSurvey[]>(INITIAL_SURVEYS);
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
  const [isConfirmingPolarCheckout, setIsConfirmingPolarCheckout] = useState(false);
  const [securityForm, setSecurityForm] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const isCreateSurveySection = activeSection === "create-survey";

  useEffect(() => {
    try {
      const storedSurveys = window.localStorage.getItem(CLIENT_DASHBOARD_SURVEYS_STORAGE_KEY);

      if (storedSurveys === null) {
        setSurveys(INITIAL_SURVEYS);
      } else {
        const parsedSurveys = JSON.parse(storedSurveys) as ClientSurvey[];

        if (Array.isArray(parsedSurveys)) {
          setSurveys(
            parsedSurveys.map((survey) => ({
              ...survey,
              description:
                survey.description ??
                INITIAL_SURVEYS.find((initialSurvey) => initialSurvey.id === survey.id)?.description ??
                "Published survey project.",
              questions:
                survey.questions ??
                INITIAL_SURVEYS.find((initialSurvey) => initialSurvey.id === survey.id)?.questions
            }))
          );
        }
      }
    } catch {
      // Ignore malformed local demo data.
      setSurveys(INITIAL_SURVEYS);
    } finally {
      setHasHydratedData(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedData) return;
    window.localStorage.setItem(CLIENT_DASHBOARD_SURVEYS_STORAGE_KEY, JSON.stringify(surveys));
  }, [hasHydratedData, surveys]);

  useEffect(() => {
    const section = searchParams.get("section");

    if (section === "create-survey") {
      setActiveSection("create-survey");
    }
  }, [searchParams]);

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
  const averageTrustScore = surveys.length > 0 ? 92 : 0;
  const averageResponseTime = surveys.length > 0 ? 0.5 : 0;
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
  const settingsCardClassName = isSettingsDark
    ? "rounded-[24px] border border-[#352d27] bg-[#241d19] p-6"
    : "rounded-[24px] border border-gray-200 bg-[#fffaf5] p-6";
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

  function handleDeleteSurvey(surveyId: number) {
    setSurveys((currentSurveys) => {
      const nextSurveys = currentSurveys.filter((survey) => survey.id !== surveyId);
      window.localStorage.setItem(CLIENT_DASHBOARD_SURVEYS_STORAGE_KEY, JSON.stringify(nextSurveys));
      return nextSurveys;
    });
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

    const createdDate = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(new Date());

    const nextSurvey: ClientSurvey = {
      id: Date.now(),
      name: payload.title,
      status: "published",
      responses: 0,
      targetResponses: payload.targetResponses,
      daysRemaining: 14,
      createdDate,
      description: payload.description,
      questionCount: payload.questionCount,
      audience: payload.audience,
      questions: payload.questions
    };

    setSurveys((currentSurveys) => {
      const nextSurveys = [nextSurvey, ...currentSurveys];
      window.localStorage.setItem(CLIENT_DASHBOARD_SURVEYS_STORAGE_KEY, JSON.stringify(nextSurveys));
      return nextSurveys;
    });

    try {
      const response = await fetch("/api/surveys/notify-community", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
          targetResponses: payload.targetResponses,
          questionCount: payload.questionCount,
          audience: payload.audience
        })
      });

      const data = (await response.json()) as {
        matchedRecipients?: number;
        sentEmails?: number;
        error?: string;
      };

      if (!response.ok) {
        return {
          matchedRecipients: 0,
          sentEmails: 0,
          notificationError: data.error ?? "Survey published, but community emails could not be sent."
        };
      }

      return {
        matchedRecipients: data.matchedRecipients ?? 0,
        sentEmails: data.sentEmails ?? 0,
        notificationError: ""
      };
    } catch {
      return {
        matchedRecipients: 0,
        sentEmails: 0,
        notificationError: "Survey published, but community emails could not be sent."
      };
    }
  }

  async function handleStartCheckout(payload: SurveyCheckoutPayload) {
    setPaymentNotice("");
    setPaymentError("");

    window.localStorage.setItem(
      CLIENT_PENDING_POLAR_CHECKOUT_STORAGE_KEY,
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
      window.localStorage.removeItem(CLIENT_PENDING_POLAR_CHECKOUT_STORAGE_KEY);
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
        window.history.replaceState(null, "", "/dashboard/client");
      }
      return;
    }

    let cancelled = false;

    async function finalizePolarCheckout() {
      setIsConfirmingPolarCheckout(true);
      setPaymentError("");
      setPaymentNotice("");

      try {
        const pendingCheckoutRaw = window.localStorage.getItem(CLIENT_PENDING_POLAR_CHECKOUT_STORAGE_KEY);

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

        window.localStorage.removeItem(CLIENT_PENDING_POLAR_CHECKOUT_STORAGE_KEY);
        window.localStorage.removeItem(CREATE_SURVEY_DRAFT_STORAGE_KEY);
        setActiveSection("active-surveys");
        setPaymentNotice(
          launchResult.notificationError
            ? `Payment confirmed and survey published. ${launchResult.notificationError}`
            : launchResult.sentEmails > 0
              ? `Payment confirmed and survey published. ${launchResult.sentEmails} matching community members were emailed.`
              : "Payment confirmed and survey published."
        );
        window.history.replaceState(null, "", "/dashboard/client");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setPaymentError(error instanceof Error ? error.message : "Polar payment verification failed.");
        window.history.replaceState(null, "", "/dashboard/client");
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
  }, [hasHydratedData, isConfirmingPolarCheckout, searchParams]);

  function handleSettingsChange<Key extends keyof DashboardSettings>(field: Key, value: DashboardSettings[Key]) {
    setSettingsSaved(false);
    setSettingsError("");
    setSettingsForm((currentSettings) => ({
      ...currentSettings,
      [field]: value
    }));
  }

  function handleTwoFactorChange(value: boolean) {
    setSettingsSaved(false);
    setSettingsError("");
    setSettingsForm((currentSettings) => ({
      ...currentSettings,
      twoFactorEnabled: value
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
        phoneNumber: nextSettings.phone,
        position: nextSettings.position,
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
                        {surveys.map((survey) => (
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
                                      <p className="font-semibold text-gray-900">
                                        {Math.round((survey.responses / survey.targetResponses) * 100)}%
                                      </p>
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
                                    <span>{Math.round((survey.responses / survey.targetResponses) * 100)}%</span>
                                  </div>
                                  <div className="h-2 w-full rounded-full bg-gray-200">
                                    <div
                                      className="h-2 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 transition-all duration-300"
                                      style={{ width: `${(survey.responses / survey.targetResponses) * 100}%` }}
                                    />
                                  </div>
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
                                      onClick={() => handleDeleteSurvey(survey.id)}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete survey
                                    </button>
                                  </div>
                                ) : null}
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
                                    onClick={() => handleDeleteSurvey(survey.id)}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete survey
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

                  {surveys.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-separate border-spacing-0">
                        <thead>
                          <tr className="text-left text-[13px] font-semibold uppercase tracking-[0.08em] text-[#a0a8b8]">
                            <th className="border-b border-gray-200 pb-4 pr-6">Survey Title</th>
                            <th className="border-b border-gray-200 pb-4 pr-6">Audience Group</th>
                            <th className="border-b border-gray-200 pb-4 pr-6">Status</th>
                            <th className="border-b border-gray-200 pb-4 pr-6">Responses</th>
                            <th className="border-b border-gray-200 pb-4">Sentiment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {surveys.map((survey) => (
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
                              <td className="border-b border-gray-100 py-6 align-top text-[15px] font-medium text-[#667085]">
                                Live
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex min-h-[180px] items-center justify-center rounded-2xl bg-[#fafafa] text-center">
                      <p className="text-[16px] text-[#8a94a6]">No survey analytics available yet.</p>
                    </div>
                  )}
                </div>
              </section>
            ) : activeSection === "settings" ? (
              <section className="max-w-5xl space-y-8">
                <div>
                  <h1 className={sectionTitleClassName}>Account Settings</h1>
                  <p className={`mt-3 text-[17px] ${settingsBodyTextClassName}`}>
                    Manage your profile, app preferences, and account security.
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

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <div className={settingsCardClassName}>
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                              isSettingsDark ? "bg-[#30241e]" : "bg-[#fff0e2]"
                            }`}
                          >
                            <Sun className="h-5 w-5 text-[#f35b04]" />
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
                                ? "border-[#ffb57a] bg-white text-[#f35b04] shadow-[0_10px_24px_rgba(243,91,4,0.08)]"
                                : isSettingsDark
                                  ? "border-[#43372f] bg-[#181311] text-[#d5cbc3] hover:border-[#ff8a33]"
                                  : "border-gray-200 bg-white text-[#6b7280] hover:border-[#ffd1ad]"
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
                                ? "border-[#ffb57a] bg-[#2a211c] text-white shadow-[0_10px_24px_rgba(42,33,28,0.18)]"
                                : isSettingsDark
                                  ? "border-[#43372f] bg-[#181311] text-[#d5cbc3] hover:border-[#ff8a33]"
                                  : "border-gray-200 bg-white text-[#6b7280] hover:border-[#ffd1ad]"
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
                            <input
                              type="password"
                              value={securityForm.newPassword}
                              onChange={(event) => handleSecurityChange("newPassword", event.target.value)}
                              className={settingsInputClassName}
                            />
                          </label>

                          <label className="block">
                            <span className={settingsLabelClassName}>
                              <Lock className="h-4 w-4 text-[#f35b04]" />
                              Confirm Password
                            </span>
                            <input
                              type="password"
                              value={securityForm.confirmPassword}
                              onChange={(event) => handleSecurityChange("confirmPassword", event.target.value)}
                              className={settingsInputClassName}
                            />
                          </label>

                          <div
                            className={`flex items-center justify-between rounded-2xl border px-4 py-4 ${
                              isSettingsDark ? "border-[#43372f] bg-[#181311]" : "border-gray-200 bg-white"
                            }`}
                          >
                            <div>
                              <p className={`text-sm font-medium ${isSettingsDark ? "text-[#e8ddd4]" : "text-[#4b5563]"}`}>
                                Two-factor Authentication
                              </p>
                              <p className={`mt-1 text-sm ${settingsMutedTextClassName}`}>Keep your account extra secure.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleTwoFactorChange(!settingsForm.twoFactorEnabled)}
                              aria-pressed={settingsForm.twoFactorEnabled}
                              className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                                settingsForm.twoFactorEnabled ? "bg-[#f35b04]" : "bg-gray-300"
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
