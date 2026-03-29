"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  Globe2,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import {
  ageSpanOptions,
  carCountOptions,
  childrenCountOptions,
  clientPositionOptions,
  countryOptions,
  educationLevelOptions,
  employmentStatusOptions,
  englishLevelOptions,
  familyStatusOptions,
  fieldOfStudyOptions,
  genderOptions,
  householdSizeOptions,
  industryOptions,
  interestOptions,
  languageSkillOptions,
  popularUniversities,
  residenceOptions,
  salaryRangeOptions,
} from "@/lib/auth-options";
import { normalizeCommunityLaunchCountry } from "@/lib/community-distribution";
import SiteLogo from "@/components/SiteLogo";
import { PRIVACY_POLICY_VERSION, TERMS_VERSION } from "@/lib/legal";
import PasswordInput from "@/components/ui/password-input";
import {
  upsertProfileRecords,
  type PersistedProfilePayload,
} from "@/lib/supabase/profile-db";
import { createClient } from "@/lib/supabase/client";

type AuthRole = "client" | "community";

type SignUpFormValues = {
  name: string;
  surname: string;
  universityEmail: string;
  educationalInstitution: string;
  customInstitution: string;
  position: string;
  country: string;
  phoneNumber: string;
  password: string;
  email: string;
  ageSpan: string;
  gender: string;
  employmentStatus: string;
  industry: string;
  salaryRange: string;
  educationalLevel: string;
  fieldOfStudy: string;
  languageSkills: string[];
  englishProficiency: string;
  placeOfResidence: string;
  familyStatus: string;
  householdSize: string;
  childrenCount: string;
  interests: string[];
  carCount: string;
  acceptLegal: boolean;
};

type LoginFormValues = {
  email: string;
  password: string;
};

type CommunitySignupEligibilityResponse = {
  allowed?: boolean;
  detectedCountry?: string | null;
  verifiedCountry?: string | null;
  message?: string;
};

const roleCopy = {
  client: {
    badge: "Client sign up",
    summary: "From research idea to real insights — fast.",
    benefits: [
      {
        icon: "target",
        title: "Access targeted global audience",
        description:
          "Reach exactly the people you need (by country, age, education, etc.)",
      },
      {
        icon: "ai",
        title: "AI-powered research tools",
        description:
          "Generate surveys, analyze results, and create reports instantly",
      },
      {
        icon: "quality",
        title: "High-quality, reliable data",
        description: "AI trust scoring filters low-quality responses",
      },
    ],
    heading: "Create client account",
    emailLabel: "University email",
    submitLabel: "Create client account",
  },
  community: {
    badge: "Community member sign up",
    summary: "Share your opinion. Earn rewards.",
    benefits: [
      {
        icon: "rewards",
        title: "Earn real rewards",
        description: "Convert your time into cash, gift cards, or discounts",
      },
      {
        icon: "global",
        title: "Be part of global research",
        description:
          "Contribute to studies from universities and researchers worldwide",
      },
      {
        icon: "fair",
        title: "Fair & smart system",
        description:
          "AI ensures fair rewards based on your response quality (not just speed).",
      },
    ],
    heading: "Create community account",
    emailLabel: "Email",
    submitLabel: "Join community",
  },
} as const;

const benefitIcons = {
  target: Target,
  ai: Sparkles,
  quality: ShieldCheck,
  rewards: Wallet,
  global: Globe2,
  fair: BadgeCheck,
} as const;

const inputClassName =
  "w-full rounded-2xl border border-[color:var(--auth-border)] bg-[color:var(--auth-input-bg)] px-4 py-3.5 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.03)] outline-none transition placeholder:text-slate-400 focus:border-[color:var(--auth-accent)] focus:ring-2 focus:ring-[color:var(--auth-accent-soft)]";

const labelClassName = "mb-2 block text-sm font-semibold text-slate-700";

function AuthFormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-[color:var(--auth-border)] bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)] sm:px-6">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[color:var(--auth-accent)]" />
        <div>
          <h3 className="text-base font-extrabold tracking-[-0.02em] text-slate-900">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function getDashboardPath(role: AuthRole, userId?: string) {
  const basePath =
    role === "client" ? "/dashboard/client" : "/dashboard/community";
  return userId ? `${basePath}/${userId}` : basePath;
}

function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const normalizedMessage = error.message.toLowerCase();

    if (normalizedMessage.includes("invalid login credentials")) {
      return "Invalid email or password.";
    }

    if (normalizedMessage.includes("email not confirmed")) {
      return "Confirm your email before logging in.";
    }

    if (normalizedMessage.includes("user already registered")) {
      return "This email is already registered. Try logging in instead.";
    }

    if (
      normalizedMessage.includes("missing") &&
      normalizedMessage.includes("supabase")
    ) {
      return error.message;
    }

    if (normalizedMessage.includes("profiles")) {
      return "Supabase profile storage is not ready yet. Run the SQL in supabase/schema.sql.";
    }

    if (
      normalizedMessage.includes("community sign-up is currently limited") ||
      normalizedMessage.includes("community allocation is full")
    ) {
      return "Community sign-up isn't available for your current location.";
    }

    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function buildProfilePayload(
  role: AuthRole,
  values: SignUpFormValues,
  normalizedInstitution: string,
): PersistedProfilePayload {
  const commonPayload = {
    role,
    email: normalizeEmail(
      role === "client" ? values.universityEmail : values.email,
    ),
    first_name: values.name.trim(),
    last_name: values.surname.trim(),
    phone_number: values.phoneNumber.trim(),
    country:
      role === "community"
        ? normalizeCommunityLaunchCountry(values.country) ?? values.country
        : values.country,
    appearance: "light" as const,
    two_factor_enabled: false,
  };

  if (role === "client") {
    return {
      ...commonPayload,
      educational_institution: normalizedInstitution,
      position: values.position,
      interests: [] as string[],
    };
  }

  return {
    ...commonPayload,
    age_span: values.ageSpan,
    gender: values.gender,
    employment_status: values.employmentStatus,
    industry: values.industry,
    salary_range: values.salaryRange,
    educational_level: values.educationalLevel,
    field_of_study: values.fieldOfStudy,
    language_skills: values.languageSkills,
    english_proficiency: values.englishProficiency,
    place_of_residence: values.placeOfResidence,
    family_status: values.familyStatus,
    household_size: values.householdSize,
    children_count: values.childrenCount,
    interests: values.interests,
    car_count: values.carCount,
  };
}

function buildSignUpMetadata(profilePayload: PersistedProfilePayload) {
  const acceptedAt = new Date().toISOString();

  return {
    ...profilePayload,
    terms_accepted_at: acceptedAt,
    terms_version: TERMS_VERSION,
    privacy_policy_accepted_at: acceptedAt,
    privacy_policy_version: PRIVACY_POLICY_VERSION,
  };
}

export default function AuthClient({
  initialType,
  initialCommunityCountry,
}: {
  initialType?: string;
  initialCommunityCountry?: string | null;
}) {
  const role: AuthRole = initialType === "community" ? "community" : "client";
  const copy = roleCopy[role];
  const isClient = role === "client";
  const router = useRouter();
  const authThemeStyle: CSSProperties & Record<string, string> = isClient
    ? {
        "--auth-accent": "#d85a2f",
        "--auth-accent-soft": "rgba(216,90,47,0.15)",
        "--auth-accent-soft-bg": "#fff4ec",
        "--auth-accent-softer-bg": "#fff7f1",
        "--auth-chip-bg": "#fff1e7",
        "--auth-border": "#ead9cc",
        "--auth-input-bg": "#fffdf9",
        "--auth-summary": "#ff9a67",
        "--auth-title": "#d85a2f",
        "--auth-message-border": "#f0dfd3",
        "--auth-message-bg": "#fff7f1",
        "--auth-selected-bg": "#fff2ea",
        "--auth-disabled-border": "#efe3da",
        "--auth-disabled-bg": "#faf6f2",
      }
    : {
        "--auth-accent": "#7c3aed",
        "--auth-accent-soft": "rgba(124,58,237,0.16)",
        "--auth-accent-soft-bg": "#f3ecff",
        "--auth-accent-softer-bg": "#f8f4ff",
        "--auth-chip-bg": "#f1ebff",
        "--auth-border": "#dccfff",
        "--auth-input-bg": "#fffdff",
        "--auth-summary": "#8e7cf7",
        "--auth-title": "#6d3fd1",
        "--auth-message-border": "#eadfff",
        "--auth-message-bg": "#f8f4ff",
        "--auth-selected-bg": "#f3ecff",
        "--auth-disabled-border": "#ede4fb",
        "--auth-disabled-bg": "#faf8ff",
      };
  const errorTextClassName = "mt-2 text-sm text-[color:var(--auth-accent)]";
  const roleToggleInactiveClassName =
    "bg-[color:var(--auth-accent-softer-bg)] text-slate-600 hover:text-[color:var(--auth-accent)]";
  const backButtonClassName =
    "inline-flex items-center gap-2 rounded-full border border-[color:var(--auth-border)] bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[color:var(--auth-accent-soft-bg)] hover:text-[color:var(--auth-accent)]";
  const tabRailClassName =
    "mt-6 grid grid-cols-2 rounded-full bg-[color:var(--auth-accent-soft-bg)] p-1";
  const activeTabClassName = "bg-[color:var(--auth-accent)] text-white";
  const inactiveTabClassName = "text-slate-600";
  const submitButtonClassName =
    "w-full rounded-2xl bg-[color:var(--auth-accent)] px-5 py-4 text-base font-bold text-white shadow-[0_20px_40px_rgba(15,23,42,0.12)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70";
  const messageClassName =
    "mt-5 rounded-2xl border border-[color:var(--auth-message-border)] bg-[color:var(--auth-message-bg)] px-4 py-3 text-sm text-slate-600";
  const leftPanelBackground = isClient
    ? "linear-gradient(180deg,#fff8f1 0%,#f5ebdf 100%)"
    : "linear-gradient(180deg,#faf6ff 0%,#efe8fb 100%)";
  const leftPanelOverlay = isClient
    ? "radial-gradient(circle_at_top_left,rgba(216,90,47,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(123,147,178,0.12),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.8),transparent_70%)"
    : "radial-gradient(circle_at_top_left,rgba(124,58,237,0.1),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(103,80,164,0.1),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.8),transparent_70%)";
  const pageBackground = isClient
    ? "radial-gradient(circle_at_top_left,rgba(216,90,47,0.08),transparent 20%),radial-gradient(circle_at_top_right,rgba(123,147,178,0.12),transparent 20%),linear-gradient(180deg,#fffdf9 0%,#f7f2eb 100%)"
    : "radial-gradient(circle_at_top_left,rgba(124,58,237,0.08),transparent 20%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent 22%),linear-gradient(180deg,#fdfbff 0%,#f4f0fb 100%)";

  const [activeTab, setActiveTab] = useState<"signup" | "login">("signup");
  const [institutionOptions, setInstitutionOptions] =
    useState<string[]>(popularUniversities);
  const [institutionStatus, setInstitutionStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [languageSkillsOpen, setLanguageSkillsOpen] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [authPending, setAuthPending] = useState<"signup" | "login" | null>(
    null,
  );

  const signUp = useForm<SignUpFormValues>({
    defaultValues: {
      languageSkills: [],
      interests: [],
      acceptLegal: false,
    },
  });
  const login = useForm<LoginFormValues>();

  const {
    register,
    watch,
    setValue,
    getValues,
    handleSubmit,
    control,
    formState: { errors },
  } = signUp;

  const {
    register: registerLogin,
    clearErrors: clearLoginErrors,
    handleSubmit: handleLoginSubmit,
    setError: setLoginError,
    formState: { errors: loginErrors },
  } = login;

  const selectedCountry = watch("country");
  const selectedInstitution = watch("educationalInstitution");

  useEffect(() => {
    if (isClient) {
      return;
    }

    setValue("country", initialCommunityCountry ?? "");
  }, [initialCommunityCountry, isClient, setValue]);

  useEffect(() => {
    if (!isClient || !selectedCountry) {
      setInstitutionOptions(popularUniversities);
      setInstitutionStatus("idle");
      return;
    }

    let cancelled = false;

    async function loadUniversities() {
      setInstitutionStatus("loading");

      try {
        const response = await fetch(
          `/api/universities?country=${encodeURIComponent(selectedCountry)}`,
        );

        if (!response.ok) {
          throw new Error("Could not load universities.");
        }

        const payload = (await response.json()) as { universities?: string[] };
        const universities = payload.universities?.length
          ? payload.universities
          : popularUniversities;

        if (cancelled) return;

        setInstitutionOptions(universities);
        setInstitutionStatus("ready");

        const currentInstitution = getValues("educationalInstitution");
        if (
          currentInstitution &&
          currentInstitution !== "Other" &&
          !universities.includes(currentInstitution)
        ) {
          setValue("educationalInstitution", "");
        }
      } catch {
        if (cancelled) return;
        setInstitutionOptions(popularUniversities);
        setInstitutionStatus("error");
      }
    }

    void loadUniversities();

    return () => {
      cancelled = true;
    };
  }, [getValues, isClient, selectedCountry, setValue]);

  useEffect(() => {
    if (selectedInstitution !== "Other") {
      setValue("customInstitution", "");
    }
  }, [selectedInstitution, setValue]);

  useEffect(() => {
    setSubmitMessage(null);
    setInterestsOpen(false);
    setLanguageSkillsOpen(false);
    setAuthPending(null);
    clearLoginErrors();
  }, [activeTab, clearLoginErrors, role]);

  async function handleRoleSubmit(values: SignUpFormValues) {
    const normalizedInstitution =
      values.educationalInstitution === "Other"
        ? values.customInstitution.trim()
        : values.educationalInstitution;

    setSubmitMessage(null);
    setAuthPending("signup");

    try {
      const supabase = createClient();
      let verifiedCommunityCountry: string | null = null;

      if (role === "community") {
        const verificationResponse = await fetch("/api/community-signup/eligibility", {
          cache: "no-store",
        });
        const verificationPayload =
          (await verificationResponse.json().catch(() => null)) as CommunitySignupEligibilityResponse | null;

        if (verificationPayload?.detectedCountry) {
          setValue("country", verificationPayload.detectedCountry);
        }

        if (
          !verificationResponse.ok ||
          !verificationPayload?.allowed ||
          !verificationPayload.verifiedCountry
        ) {
          setSubmitMessage(
            verificationPayload?.message ||
              "Community sign-up isn't available for your current location.",
          );
          return;
        }

        verifiedCommunityCountry = verificationPayload.verifiedCountry;
      }

      const profilePayload = buildProfilePayload(
        role,
        verifiedCommunityCountry
          ? { ...values, country: verifiedCommunityCountry }
          : values,
        normalizedInstitution,
      );
      const signUpMetadata = buildSignUpMetadata(profilePayload);
      const { data, error } = await supabase.auth.signUp({
        email: profilePayload.email,
        password: values.password,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/confirm?next=${encodeURIComponent(getDashboardPath(role))}`
              : undefined,
          data: signUpMetadata,
        },
      });

      if (error) {
        throw error;
      }

      if (data.user && data.session) {
        try {
          await upsertProfileRecords(supabase, data.user.id, profilePayload);
        } catch (profileError) {
          console.warn(
            "Supabase profile upsert during sign-up failed.",
            profileError,
          );
        }

        router.push(getDashboardPath(role, data.user.id));
        router.refresh();
        return;
      }

      setSubmitMessage(
        "Account created. Check your email to confirm your sign up, then log in.",
      );
      setActiveTab("login");
    } catch (error) {
      setSubmitMessage(getAuthErrorMessage(error));
    } finally {
      setAuthPending(null);
    }
  }

  async function handleRoleLogin(values: LoginFormValues) {
    clearLoginErrors();
    setSubmitMessage(null);
    setAuthPending("login");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(values.email),
        password: values.password,
      });

      if (error) {
        throw error;
      }

      const metadataRole = data.user.user_metadata?.role;
      let resolvedRole: AuthRole =
        metadataRole === "client" || metadataRole === "community"
          ? metadataRole
          : role;

      if (!(metadataRole === "client" || metadataRole === "community")) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        if (
          !profileError &&
          (profileData?.role === "client" || profileData?.role === "community")
        ) {
          resolvedRole = profileData.role;
        }
      }

      router.push(getDashboardPath(resolvedRole, data.user.id));
      router.refresh();
    } catch (error) {
      setLoginError("password", {
        type: "manual",
        message: getAuthErrorMessage(error),
      });
    } finally {
      setAuthPending(null);
    }
  }

  return (
    <main
      className="min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8"
      style={{ ...authThemeStyle, backgroundImage: pageBackground }}
    >
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[32px] border border-white/80 bg-white/92 px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" aria-label="MERGEN home">
              <SiteLogo />
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/auth?type=client"
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isClient
                    ? "bg-[color:var(--auth-accent)] text-white"
                    : roleToggleInactiveClassName
                }`}
              >
                Client
              </Link>
              <Link
                href="/auth?type=community"
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  !isClient
                    ? "bg-[color:var(--auth-accent)] text-white"
                    : roleToggleInactiveClassName
                }`}
              >
                Community
              </Link>
              <Link href="/" className={backButtonClassName}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <div
            className="order-2 relative overflow-hidden rounded-[36px] border border-[color:var(--auth-border)] p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-10 lg:order-1"
            style={{ backgroundImage: leftPanelBackground }}
          >
            <div
              className="absolute inset-0"
              style={{ backgroundImage: leftPanelOverlay }}
            />
            <div
              className="absolute right-[-4rem] top-[-2rem] h-40 w-40 rounded-full blur-3xl"
              style={{
                backgroundColor: isClient
                  ? "rgba(216,90,47,0.08)"
                  : "rgba(124,58,237,0.1)",
              }}
            />
            <div
              className="absolute bottom-[-4rem] left-[-3rem] h-44 w-44 rounded-full blur-3xl"
              style={{
                backgroundColor: isClient
                  ? "rgba(123,147,178,0.1)"
                  : "rgba(99,102,241,0.08)",
              }}
            />

            <div className="relative">
              <span className="inline-flex items-center rounded-full border border-white/75 bg-white px-4 py-2 text-sm font-semibold text-[color:var(--auth-accent)] shadow-sm">
                {copy.badge}
              </span>

              <p className="mt-6 max-w-2xl text-2xl font-extrabold leading-tight tracking-[-0.03em] text-[color:var(--auth-summary)] sm:text-3xl">
                {copy.summary}
              </p>

              <div className="mt-8 grid gap-4">
                {copy.benefits.map((benefit) => {
                  const Icon = benefitIcons[benefit.icon];

                  return (
                    <div
                      key={benefit.title}
                      className="rounded-[28px] border border-white/80 bg-white/88 px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]"
                    >
                      <div className="flex items-start gap-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--auth-chip-bg)] text-[color:var(--auth-accent)] shadow-[0_12px_30px_rgba(15,23,42,0.1)]">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-base font-extrabold tracking-[-0.02em] text-[color:var(--auth-title)]">
                            {benefit.title}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-700">
                            {benefit.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="order-1 rounded-[36px] border border-white/80 bg-white/94 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8 lg:order-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--auth-accent)]">
                  {copy.badge}
                </p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-900">
                  {copy.heading}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                  Choose the path that fits you, then complete the form below.
                </p>
              </div>
            </div>

            <div
              className={`${tabRailClassName} border border-[color:var(--auth-border)]`}
            >
              <button
                type="button"
                onClick={() => setActiveTab("signup")}
                className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
                  activeTab === "signup"
                    ? activeTabClassName
                    : inactiveTabClassName
                }`}
              >
                Sign up
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
                  activeTab === "login"
                    ? activeTabClassName
                    : inactiveTabClassName
                }`}
              >
                Log in
              </button>
            </div>

            {activeTab === "signup" ? (
              <form
                className="mt-6 space-y-6"
                onSubmit={handleSubmit(handleRoleSubmit)}
              >
                {isClient ? (
                  <>
                    <AuthFormSection
                      title="Basic information"
                      description="Tell us who is creating this research account."
                    >
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="client-name"
                          >
                            Name
                          </label>
                          <input
                            id="client-name"
                            autoComplete="given-name"
                            {...register("name", {
                              required: "Name is required.",
                            })}
                            className={inputClassName}
                          />
                          {errors.name ? (
                            <p className={errorTextClassName}>
                              {errors.name.message}
                            </p>
                          ) : null}
                        </div>

                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="client-surname"
                          >
                            Surname
                          </label>
                          <input
                            id="client-surname"
                            autoComplete="family-name"
                            {...register("surname", {
                              required: "Surname is required.",
                            })}
                            className={inputClassName}
                          />
                          {errors.surname ? (
                            <p className={errorTextClassName}>
                              {errors.surname.message}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        <label
                          className={labelClassName}
                          htmlFor="client-email"
                        >
                          University email
                        </label>
                        <input
                          id="client-email"
                          type="email"
                          autoComplete="email"
                          {...register("universityEmail", {
                            required: "University email is required.",
                            pattern: {
                              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                              message: "Enter a valid email address.",
                            },
                          })}
                          className={inputClassName}
                        />
                        {errors.universityEmail ? (
                          <p className={errorTextClassName}>
                            {errors.universityEmail.message}
                          </p>
                        ) : null}
                      </div>
                    </AuthFormSection>

                    <AuthFormSection
                      title="Work and institution"
                      description="These details shape the university list and client profile."
                    >
                      <div>
                        <label
                          className={labelClassName}
                          htmlFor="client-country"
                        >
                          Country
                        </label>
                        <div className="relative">
                          <select
                            id="client-country"
                            {...register("country", {
                              required: "Country is required.",
                            })}
                            className={`${inputClassName} appearance-none pr-11`}
                          >
                            <option value="">Select country</option>
                            {countryOptions.map((country) => (
                              <option key={country} value={country}>
                                {country}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                        {errors.country ? (
                          <p className={errorTextClassName}>
                            {errors.country.message}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <label
                          className={labelClassName}
                          htmlFor="client-institution"
                        >
                          Educational institution
                        </label>
                        <div className="relative">
                          <select
                            id="client-institution"
                            {...register("educationalInstitution", {
                              required: "Educational institution is required.",
                            })}
                            className={`${inputClassName} appearance-none pr-11`}
                          >
                            <option value="">Select institution</option>
                            {institutionOptions.map((institution) => (
                              <option key={institution} value={institution}>
                                {institution}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {institutionStatus === "loading"
                            ? "Loading universities for the selected country..."
                            : institutionStatus === "error"
                              ? "University lookup fell back to a local list."
                              : "Choose country to narrow the university list, or use Other."}
                        </p>
                        {errors.educationalInstitution ? (
                          <p className={errorTextClassName}>
                            {errors.educationalInstitution.message}
                          </p>
                        ) : null}
                      </div>

                      {selectedInstitution === "Other" ? (
                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="client-custom-institution"
                          >
                            Other institution
                          </label>
                          <input
                            id="client-custom-institution"
                            {...register("customInstitution", {
                              validate: (value) =>
                                selectedInstitution === "Other" && !value.trim()
                                  ? "Write your institution."
                                  : true,
                            })}
                            className={inputClassName}
                          />
                          {errors.customInstitution ? (
                            <p className={errorTextClassName}>
                              {errors.customInstitution.message}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div>
                        <label
                          className={labelClassName}
                          htmlFor="client-position"
                        >
                          Position
                        </label>
                        <div className="relative">
                          <select
                            id="client-position"
                            {...register("position", {
                              required: "Position is required.",
                            })}
                            className={`${inputClassName} appearance-none pr-11`}
                          >
                            <option value="">Select position</option>
                            {clientPositionOptions.map((position) => (
                              <option key={position} value={position}>
                                {position}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                        {errors.position ? (
                          <p className={errorTextClassName}>
                            {errors.position.message}
                          </p>
                        ) : null}
                      </div>
                    </AuthFormSection>

                    <AuthFormSection
                      title="Account security"
                      description="Add an optional phone number and choose a password."
                    >
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="client-phone"
                          >
                            Phone number (optional)
                          </label>
                          <input
                            id="client-phone"
                            type="tel"
                            autoComplete="tel"
                            {...register("phoneNumber")}
                            className={inputClassName}
                          />
                        </div>

                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="client-password"
                          >
                            Password
                          </label>
                          <PasswordInput
                            id="client-password"
                            autoComplete="new-password"
                            {...register("password", {
                              required: "Password is required.",
                              minLength: {
                                value: 8,
                                message:
                                  "Password must be at least 8 characters.",
                              },
                            })}
                            className={inputClassName}
                          />
                          {errors.password ? (
                            <p className={errorTextClassName}>
                              {errors.password.message}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </AuthFormSection>
                  </>
                ) : (
                  <>
                    <AuthFormSection
                      title="Basic information"
                      description="Start with the details used to create your account."
                    >
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="community-name"
                          >
                            Name
                          </label>
                          <input
                            id="community-name"
                            autoComplete="given-name"
                            {...register("name", {
                              required: "Name is required.",
                            })}
                            className={inputClassName}
                          />
                          {errors.name ? (
                            <p className={errorTextClassName}>
                              {errors.name.message}
                            </p>
                          ) : null}
                        </div>

                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="community-surname"
                          >
                            Surname
                          </label>
                          <input
                            id="community-surname"
                            autoComplete="family-name"
                            {...register("surname", {
                              required: "Surname is required.",
                            })}
                            className={inputClassName}
                          />
                          {errors.surname ? (
                            <p className={errorTextClassName}>
                              {errors.surname.message}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        <label
                          className={labelClassName}
                          htmlFor="community-email"
                        >
                          Email
                        </label>
                        <input
                          id="community-email"
                          type="email"
                          autoComplete="email"
                          {...register("email", {
                            required: "Email is required.",
                            pattern: {
                              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                              message: "Enter a valid email address.",
                            },
                          })}
                          className={inputClassName}
                        />
                        {errors.email ? (
                          <p className={errorTextClassName}>
                            {errors.email.message}
                          </p>
                        ) : null}
                      </div>
                    </AuthFormSection>

                    <AuthFormSection
                      title="Profile details"
                      description="These answers help MERGEN match you with relevant surveys."
                    >
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="community-age"
                          >
                            Age span
                          </label>
                          <div className="relative">
                            <select
                              id="community-age"
                              {...register("ageSpan", {
                                required: "Age span is required.",
                              })}
                              className={`${inputClassName} appearance-none pr-11`}
                            >
                              <option value="">Select age span</option>
                              {ageSpanOptions.map((ageSpan) => (
                                <option key={ageSpan} value={ageSpan}>
                                  {ageSpan}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {errors.ageSpan ? (
                            <p className={errorTextClassName}>
                              {errors.ageSpan.message}
                            </p>
                          ) : null}
                        </div>

                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="community-gender"
                          >
                            Gender
                          </label>
                          <div className="relative">
                            <select
                              id="community-gender"
                              {...register("gender", {
                                required: "Gender is required.",
                              })}
                              className={`${inputClassName} appearance-none pr-11`}
                            >
                              <option value="">Select gender</option>
                              {genderOptions.map((gender) => (
                                <option key={gender} value={gender}>
                                  {gender}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {errors.gender ? (
                            <p className={errorTextClassName}>
                              {errors.gender.message}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="community-employment-status"
                          >
                            Employment status
                          </label>
                          <div className="relative">
                            <select
                              id="community-employment-status"
                              {...register("employmentStatus", {
                                required: "Employment status is required.",
                              })}
                              className={`${inputClassName} appearance-none pr-11`}
                            >
                              <option value="">Select employment status</option>
                              {employmentStatusOptions.map((employmentStatus) => (
                                <option key={employmentStatus} value={employmentStatus}>
                                  {employmentStatus}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {errors.employmentStatus ? (
                            <p className={errorTextClassName}>
                              {errors.employmentStatus.message}
                            </p>
                          ) : null}
                        </div>

                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="community-industry"
                          >
                            Industry
                          </label>
                          <div className="relative">
                            <select
                              id="community-industry"
                              {...register("industry", {
                                required: "Industry is required.",
                              })}
                              className={`${inputClassName} appearance-none pr-11`}
                            >
                              <option value="">Select industry</option>
                              {industryOptions.map((industry) => (
                                <option key={industry} value={industry}>
                                  {industry}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {errors.industry ? (
                            <p className={errorTextClassName}>
                              {errors.industry.message}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="community-salary"
                          >
                            Salary range (USD)
                          </label>
                          <div className="relative">
                            <select
                              id="community-salary"
                              {...register("salaryRange", {
                                required: "Salary range is required.",
                              })}
                              className={`${inputClassName} appearance-none pr-11`}
                            >
                              <option value="">Select salary range</option>
                              {salaryRangeOptions.map((salaryRange) => (
                                <option key={salaryRange} value={salaryRange}>
                                  {salaryRange}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {errors.salaryRange ? (
                            <p className={errorTextClassName}>
                              {errors.salaryRange.message}
                            </p>
                          ) : null}
                        </div>

                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="community-education"
                          >
                            Educational level
                          </label>
                          <div className="relative">
                            <select
                              id="community-education"
                              {...register("educationalLevel", {
                                required: "Educational level is required.",
                              })}
                              className={`${inputClassName} appearance-none pr-11`}
                            >
                              <option value="">Select educational level</option>
                              {educationLevelOptions.map((educationLevel) => (
                                <option
                                  key={educationLevel}
                                  value={educationLevel}
                                >
                                  {educationLevel}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {errors.educationalLevel ? (
                            <p className={errorTextClassName}>
                              {errors.educationalLevel.message}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="community-field-of-study"
                          >
                            Field of study
                          </label>
                          <div className="relative">
                            <select
                              id="community-field-of-study"
                              {...register("fieldOfStudy", {
                                required: "Field of study is required.",
                              })}
                              className={`${inputClassName} appearance-none pr-11`}
                            >
                              <option value="">Select field of study</option>
                              {fieldOfStudyOptions.map((fieldOfStudy) => (
                                <option key={fieldOfStudy} value={fieldOfStudy}>
                                  {fieldOfStudy}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {errors.fieldOfStudy ? (
                            <p className={errorTextClassName}>
                              {errors.fieldOfStudy.message}
                            </p>
                          ) : null}
                        </div>

                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="community-english-level"
                          >
                            English level
                          </label>
                          <div className="relative">
                            <select
                              id="community-english-level"
                              {...register("englishProficiency", {
                                required: "English level is required.",
                              })}
                              className={`${inputClassName} appearance-none pr-11`}
                            >
                              <option value="">Select English level</option>
                              {englishLevelOptions.map((englishLevel) => (
                                <option key={englishLevel} value={englishLevel}>
                                  {englishLevel}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {errors.englishProficiency ? (
                            <p className={errorTextClassName}>
                              {errors.englishProficiency.message}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="community-country"
                          >
                            Detected country
                          </label>
                          <input
                            id="community-country"
                            value={selectedCountry || ""}
                            readOnly
                            className={`${inputClassName} bg-slate-50 text-slate-600`}
                            placeholder="Detected when you sign up"
                          />
                          <input type="hidden" {...register("country")} />
                          <p className="mt-2 text-sm text-slate-500">
                            Your community country is verified automatically from your connection. Manual country switching is disabled.
                          </p>
                        </div>

                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="community-residence"
                          >
                            Place of residence
                          </label>
                          <div className="relative">
                            <select
                              id="community-residence"
                              {...register("placeOfResidence", {
                                required: "Place of residence is required.",
                              })}
                              className={`${inputClassName} appearance-none pr-11`}
                            >
                              <option value="">
                                Select place of residence
                              </option>
                              {residenceOptions.map((placeOfResidence) => (
                                <option
                                  key={placeOfResidence}
                                  value={placeOfResidence}
                                >
                                  {placeOfResidence}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {errors.placeOfResidence ? (
                            <p className={errorTextClassName}>
                              {errors.placeOfResidence.message}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="community-family-status"
                          >
                            Family status
                          </label>
                          <div className="relative">
                            <select
                              id="community-family-status"
                              {...register("familyStatus", {
                                required: "Family status is required.",
                              })}
                              className={`${inputClassName} appearance-none pr-11`}
                            >
                              <option value="">Select family status</option>
                              {familyStatusOptions.map((familyStatus) => (
                                <option key={familyStatus} value={familyStatus}>
                                  {familyStatus}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {errors.familyStatus ? (
                            <p className={errorTextClassName}>
                              {errors.familyStatus.message}
                            </p>
                          ) : null}
                        </div>

                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="community-household-size"
                          >
                            Household size
                          </label>
                          <div className="relative">
                            <select
                              id="community-household-size"
                              {...register("householdSize", {
                                required: "Household size is required.",
                              })}
                              className={`${inputClassName} appearance-none pr-11`}
                            >
                              <option value="">Select household size</option>
                              {householdSizeOptions.map((householdSize) => (
                                <option key={householdSize} value={householdSize}>
                                  {householdSize}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {errors.householdSize ? (
                            <p className={errorTextClassName}>
                              {errors.householdSize.message}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="community-children-count"
                          >
                            Number of children
                          </label>
                          <div className="relative">
                            <select
                              id="community-children-count"
                              {...register("childrenCount", {
                                required: "Number of children is required.",
                              })}
                              className={`${inputClassName} appearance-none pr-11`}
                            >
                              <option value="">Select number of children</option>
                              {childrenCountOptions.map((childrenCount) => (
                                <option key={childrenCount} value={childrenCount}>
                                  {childrenCount}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {errors.childrenCount ? (
                            <p className={errorTextClassName}>
                              {errors.childrenCount.message}
                            </p>
                          ) : null}
                        </div>

                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="community-car-count"
                          >
                            Car count
                          </label>
                          <div className="relative">
                            <select
                              id="community-car-count"
                              {...register("carCount", {
                                required: "Car count is required.",
                              })}
                              className={`${inputClassName} appearance-none pr-11`}
                            >
                              <option value="">Select car count</option>
                              {carCountOptions.map((carCount) => (
                                <option key={carCount} value={carCount}>
                                  {carCount}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {errors.carCount ? (
                            <p className={errorTextClassName}>
                              {errors.carCount.message}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        <label className={labelClassName}>Language skills</label>
                        <Controller
                          control={control}
                          name="languageSkills"
                          rules={{
                            validate: (value) =>
                              value.length > 0
                                ? true
                                : "Select at least 1 language skill. You can choose up to 5.",
                          }}
                          render={({ field }) => (
                            <div className="rounded-[28px] border border-[color:var(--auth-border)] bg-[color:var(--auth-input-bg)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                              <button
                                type="button"
                                onClick={() =>
                                  setLanguageSkillsOpen((current) => !current)
                                }
                                className="flex w-full items-center justify-between rounded-2xl bg-[color:var(--auth-accent-softer-bg)] px-4 py-3 text-left text-sm font-semibold text-slate-700"
                              >
                                <span>
                                  {field.value.length > 0
                                    ? `${field.value.length} language${field.value.length > 1 ? "s" : ""} selected`
                                    : "Select up to 5 languages"}
                                </span>
                                <ChevronDown
                                  className={`h-4 w-4 text-slate-400 transition ${languageSkillsOpen ? "rotate-180" : ""}`}
                                />
                              </button>

                              {languageSkillsOpen ? (
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                  {languageSkillOptions.map((languageSkill) => {
                                    const selected =
                                      field.value.includes(languageSkill);
                                    const disabled =
                                      !selected && field.value.length >= 5;

                                    return (
                                      <button
                                        key={languageSkill}
                                        type="button"
                                        onClick={() => {
                                          if (selected) {
                                            field.onChange(
                                              field.value.filter(
                                                (value) => value !== languageSkill,
                                              ),
                                            );
                                            return;
                                          }

                                          if (field.value.length < 5) {
                                            field.onChange([
                                              ...field.value,
                                              languageSkill,
                                            ]);
                                          }
                                        }}
                                        disabled={disabled}
                                        className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                                          selected
                                            ? "border-[color:var(--auth-accent)] bg-[color:var(--auth-selected-bg)] text-[color:var(--auth-accent)]"
                                            : disabled
                                              ? "border-[color:var(--auth-disabled-border)] bg-[color:var(--auth-disabled-bg)] text-slate-300"
                                              : "border-[color:var(--auth-disabled-border)] bg-white text-slate-600 hover:border-[color:var(--auth-accent)] hover:text-[color:var(--auth-accent)]"
                                        }`}
                                      >
                                        {languageSkill}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : null}

                              {field.value.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {field.value.map((languageSkill) => (
                                    <span
                                      key={languageSkill}
                                      className="inline-flex items-center rounded-full bg-[color:var(--auth-selected-bg)] px-3 py-1 text-xs font-semibold text-[color:var(--auth-accent)]"
                                    >
                                      {languageSkill}
                                    </span>
                                  ))}
                                </div>
                              ) : null}

                              <p className="mt-3 text-sm text-slate-500">
                                Maximum 5 choices.
                              </p>
                            </div>
                          )}
                        />
                        {errors.languageSkills ? (
                          <p className={errorTextClassName}>
                            {errors.languageSkills.message}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <label className={labelClassName}>Interests</label>
                        <Controller
                          control={control}
                          name="interests"
                          rules={{
                            validate: (value) =>
                              value.length > 0
                                ? true
                                : "Select at least 1 interest. You can choose up to 3.",
                          }}
                          render={({ field }) => (
                            <div className="rounded-[28px] border border-[color:var(--auth-border)] bg-[color:var(--auth-input-bg)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                              <button
                                type="button"
                                onClick={() =>
                                  setInterestsOpen((current) => !current)
                                }
                                className="flex w-full items-center justify-between rounded-2xl bg-[color:var(--auth-accent-softer-bg)] px-4 py-3 text-left text-sm font-semibold text-slate-700"
                              >
                                <span>
                                  {field.value.length > 0
                                    ? `${field.value.length} interest${field.value.length > 1 ? "s" : ""} selected`
                                    : "Select up to 3 interests"}
                                </span>
                                <ChevronDown
                                  className={`h-4 w-4 text-slate-400 transition ${interestsOpen ? "rotate-180" : ""}`}
                                />
                              </button>

                              {interestsOpen ? (
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                  {interestOptions.map((interest) => {
                                    const selected =
                                      field.value.includes(interest);
                                    const disabled =
                                      !selected && field.value.length >= 3;

                                    return (
                                      <button
                                        key={interest}
                                        type="button"
                                        onClick={() => {
                                          if (selected) {
                                            field.onChange(
                                              field.value.filter(
                                                (value) => value !== interest,
                                              ),
                                            );
                                            return;
                                          }

                                          if (field.value.length < 3) {
                                            field.onChange([
                                              ...field.value,
                                              interest,
                                            ]);
                                          }
                                        }}
                                        disabled={disabled}
                                        className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                                          selected
                                            ? "border-[color:var(--auth-accent)] bg-[color:var(--auth-selected-bg)] text-[color:var(--auth-accent)]"
                                            : disabled
                                              ? "border-[color:var(--auth-disabled-border)] bg-[color:var(--auth-disabled-bg)] text-slate-300"
                                              : "border-[color:var(--auth-disabled-border)] bg-white text-slate-600 hover:border-[color:var(--auth-accent)] hover:text-[color:var(--auth-accent)]"
                                        }`}
                                      >
                                        {interest}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : null}

                              {field.value.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {field.value.map((interest) => (
                                    <span
                                      key={interest}
                                      className="inline-flex items-center rounded-full bg-[color:var(--auth-selected-bg)] px-3 py-1 text-xs font-semibold text-[color:var(--auth-accent)]"
                                    >
                                      {interest}
                                    </span>
                                  ))}
                                </div>
                              ) : null}

                              <p className="mt-3 text-sm text-slate-500">
                                Maximum 3 choices.
                              </p>
                            </div>
                          )}
                        />
                        {errors.interests ? (
                          <p className={errorTextClassName}>
                            {errors.interests.message}
                          </p>
                        ) : null}
                      </div>
                    </AuthFormSection>

                    <AuthFormSection
                      title="Account security"
                      description="Add an optional phone number and choose a password."
                    >
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="community-phone"
                          >
                            Phone number (optional)
                          </label>
                          <input
                            id="community-phone"
                            type="tel"
                            autoComplete="tel"
                            {...register("phoneNumber")}
                            className={inputClassName}
                          />
                        </div>

                        <div>
                          <label
                            className={labelClassName}
                            htmlFor="community-password"
                          >
                            Password
                          </label>
                          <PasswordInput
                            id="community-password"
                            autoComplete="new-password"
                            {...register("password", {
                              required: "Password is required.",
                              minLength: {
                                value: 8,
                                message:
                                  "Password must be at least 8 characters.",
                              },
                            })}
                            className={inputClassName}
                          />
                          {errors.password ? (
                            <p className={errorTextClassName}>
                              {errors.password.message}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </AuthFormSection>
                  </>
                )}

                <div className="rounded-[28px] border border-[color:var(--auth-border)] bg-[color:var(--auth-accent-softer-bg)] px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
                  <label
                    className="flex items-start gap-3 text-sm leading-6 text-slate-600"
                    htmlFor="accept-legal"
                  >
                    <input
                      id="accept-legal"
                      type="checkbox"
                      {...register("acceptLegal", {
                        required:
                          "You must accept the Terms and Conditions to create an account.",
                      })}
                      className="mt-1 h-4 w-4 rounded border-[color:var(--auth-border)] text-[color:var(--auth-accent)] focus:ring-[color:var(--auth-accent-soft)]"
                    />
                    <span>
                      I confirm that I am at least 18 years old, I agree to the{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="font-semibold text-[color:var(--auth-accent)] underline underline-offset-2"
                      >
                        Terms &amp; Conditions
                      </Link>
                      , and I acknowledge the{" "}
                      <Link
                        href="/privacy"
                        target="_blank"
                        className="font-semibold text-[color:var(--auth-accent)] underline underline-offset-2"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                  {errors.acceptLegal ? (
                    <p className={errorTextClassName}>
                      {errors.acceptLegal.message}
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={authPending !== null}
                  className={submitButtonClassName}
                >
                  {authPending === "signup"
                    ? "Creating account..."
                    : copy.submitLabel}
                </button>
              </form>
            ) : (
              <form
                className="mt-6 space-y-6"
                onSubmit={handleLoginSubmit(handleRoleLogin)}
              >
                <AuthFormSection
                  title="Welcome back"
                  description="Use the same details you signed up with."
                >
                  <div>
                    <label className={labelClassName} htmlFor="login-email">
                      {copy.emailLabel}
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      {...registerLogin("email", {
                        required: "Email is required.",
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: "Enter a valid email address.",
                        },
                      })}
                      className={inputClassName}
                    />
                    {loginErrors.email ? (
                      <p className={errorTextClassName}>
                        {loginErrors.email.message}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className={labelClassName} htmlFor="login-password">
                      Password
                    </label>
                    <PasswordInput
                      id="login-password"
                      autoComplete="current-password"
                      {...registerLogin("password", {
                        required: "Password is required.",
                      })}
                      className={inputClassName}
                    />
                    {loginErrors.password ? (
                      <p className={errorTextClassName}>
                        {loginErrors.password.message}
                      </p>
                    ) : null}
                  </div>
                </AuthFormSection>

                <button
                  type="submit"
                  disabled={authPending !== null}
                  className={submitButtonClassName}
                >
                  {authPending === "login" ? "Logging in..." : "Log in"}
                </button>
              </form>
            )}

            {submitMessage ? (
              <div className={messageClassName}>{submitMessage}</div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
