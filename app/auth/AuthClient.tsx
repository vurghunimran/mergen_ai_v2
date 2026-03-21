"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ArrowLeft, BadgeCheck, ChevronDown, Globe2, ShieldCheck, Sparkles, Target, Wallet } from "lucide-react";
import {
  ageSpanOptions,
  carCountOptions,
  clientPositionOptions,
  countryOptions,
  educationLevelOptions,
  familyStatusOptions,
  genderOptions,
  interestOptions,
  popularUniversities,
  residenceOptions,
  salaryRangeOptions
} from "@/lib/auth-options";
import { CLIENT_DEMO_CREDENTIALS, COMMUNITY_DEMO_CREDENTIALS } from "@/lib/mock-auth";

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
  salaryRange: string;
  educationalLevel: string;
  placeOfResidence: string;
  familyStatus: string;
  interests: string[];
  carCount: string;
};

type LoginFormValues = {
  email: string;
  password: string;
};

const roleCopy = {
  client: {
    badge: "Client sign up",
    summary: "From research idea to real insights — fast.",
    benefits: [
      {
        icon: "target",
        title: "Access targeted global audience",
        description: "Reach exactly the people you need (by country, age, education, etc.)"
      },
      {
        icon: "ai",
        title: "AI-powered research tools",
        description: "Generate surveys, analyze results, and create reports instantly"
      },
      {
        icon: "quality",
        title: "High-quality, reliable data",
        description: "AI trust scoring filters low-quality responses"
      }
    ],
    heading: "Create client account",
    emailLabel: "University email",
    submitLabel: "Create client account"
  },
  community: {
    badge: "Community member sign up",
    summary: "Share your opinion. Earn rewards.",
    benefits: [
      {
        icon: "rewards",
        title: "Earn real rewards",
        description: "Convert your time into cash, gift cards, or discounts"
      },
      {
        icon: "global",
        title: "Be part of global research",
        description: "Contribute to studies from universities and researchers worldwide"
      },
      {
        icon: "fair",
        title: "Fair & smart system",
        description: "AI ensures fair rewards based on your response quality (not just speed)."
      }
    ],
    heading: "Create community account",
    emailLabel: "Email",
    submitLabel: "Join community"
  }
} as const;

const benefitIcons = {
  target: Target,
  ai: Sparkles,
  quality: ShieldCheck,
  rewards: Wallet,
  global: Globe2,
  fair: BadgeCheck
} as const;

const inputClassName =
  "w-full rounded-2xl border border-[#ead9cc] bg-[#fffdf9] px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#d85a2f] focus:ring-2 focus:ring-[#d85a2f]/15";

const labelClassName = "mb-2 block text-sm font-semibold text-slate-700";

export default function AuthClient({ initialType }: { initialType?: string }) {
  const role: AuthRole = initialType === "community" ? "community" : "client";
  const copy = roleCopy[role];
  const isClient = role === "client";
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"signup" | "login">("signup");
  const [institutionOptions, setInstitutionOptions] = useState<string[]>(popularUniversities);
  const [institutionStatus, setInstitutionStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const signUp = useForm<SignUpFormValues>({
    defaultValues: {
      interests: []
    }
  });
  const login = useForm<LoginFormValues>();

  const {
    register,
    watch,
    setValue,
    getValues,
    handleSubmit,
    control,
    formState: { errors }
  } = signUp;

  const {
    register: registerLogin,
    clearErrors: clearLoginErrors,
    handleSubmit: handleLoginSubmit,
    setError: setLoginError,
    formState: { errors: loginErrors }
  } = login;

  const selectedCountry = watch("country");
  const selectedInstitution = watch("educationalInstitution");

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
        const response = await fetch(`/api/universities?country=${encodeURIComponent(selectedCountry)}`);

        if (!response.ok) {
          throw new Error("Could not load universities.");
        }

        const payload = (await response.json()) as { universities?: string[] };
        const universities = payload.universities?.length ? payload.universities : popularUniversities;

        if (cancelled) return;

        setInstitutionOptions(universities);
        setInstitutionStatus("ready");

        const currentInstitution = getValues("educationalInstitution");
        if (currentInstitution && currentInstitution !== "Other" && !universities.includes(currentInstitution)) {
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
    clearLoginErrors();
  }, [activeTab, clearLoginErrors, role]);

  function handleRoleSubmit(values: SignUpFormValues) {
    const normalizedInstitution =
      values.educationalInstitution === "Other" ? values.customInstitution.trim() : values.educationalInstitution;

    const payload = isClient
      ? {
          name: values.name,
          surname: values.surname,
          universityEmail: values.universityEmail,
          educationalInstitution: normalizedInstitution,
          position: values.position,
          country: values.country,
          phoneNumber: values.phoneNumber,
          password: values.password
        }
      : {
          name: values.name,
          surname: values.surname,
          email: values.email,
          ageSpan: values.ageSpan,
          gender: values.gender,
          salaryRange: values.salaryRange,
          educationalLevel: values.educationalLevel,
          country: values.country,
          placeOfResidence: values.placeOfResidence,
          familyStatus: values.familyStatus,
          interests: values.interests,
          carCount: values.carCount,
          phoneNumber: values.phoneNumber,
          password: values.password
        };

    console.info("Auth sign-up payload", payload);
    setSubmitMessage(
      isClient
        ? "Client sign-up form is ready. The next step is connecting it to your auth backend."
        : "Community sign-up form is ready. The next step is connecting it to your auth backend."
    );
  }

  function handleRoleLogin(values: LoginFormValues) {
    clearLoginErrors();
    setSubmitMessage(null);

    if (isClient) {
      const normalizedEmail = values.email.trim().toLowerCase();

      if (
        normalizedEmail === CLIENT_DEMO_CREDENTIALS.email &&
        values.password === CLIENT_DEMO_CREDENTIALS.password
      ) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("mergen-demo-role", "client");
        }

        router.push("/dashboard/client");
        return;
      }

      setLoginError("password", {
        type: "manual",
        message: "Use the client demo credentials to preview the dashboard."
      });
      return;
    }

    const normalizedEmail = values.email.trim().toLowerCase();

    if (
      normalizedEmail === COMMUNITY_DEMO_CREDENTIALS.email &&
      values.password === COMMUNITY_DEMO_CREDENTIALS.password
    ) {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("mergen-demo-role", "community");
      }

      router.push("/dashboard/community");
      return;
    }

    setLoginError("password", {
      type: "manual",
      message: "Use the community demo credentials to preview the dashboard."
    });
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(216,90,47,0.12),transparent_22%),radial-gradient(circle_at_top_right,rgba(123,147,178,0.18),transparent_22%),linear-gradient(180deg,#fffdf9_0%,#f7f2eb_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-full border border-white/70 bg-white/85 px-5 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff1e7] text-[#d85a2f]">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-lg font-extrabold tracking-tight text-[#d85a2f] sm:text-xl">MERGEN</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/auth?type=client"
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isClient ? "bg-[#d85a2f] text-white" : "bg-[#fff7f1] text-slate-600 hover:text-[#d85a2f]"
                }`}
              >
                Client
              </Link>
              <Link
                href="/auth?type=community"
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  !isClient ? "bg-[#d85a2f] text-white" : "bg-[#fff7f1] text-slate-600 hover:text-[#d85a2f]"
                }`}
              >
                Community
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-[#ead9cc] bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#d85a2f]/30 hover:text-[#d85a2f]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative overflow-hidden rounded-[36px] border border-white/40 bg-[linear-gradient(155deg,#f5e9dc_0%,#ecdccd_52%,#dccdc2_100%)] p-8 shadow-[0_32px_90px_rgba(15,23,42,0.12)] sm:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(216,90,47,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(123,147,178,0.18),transparent_34%)]" />
            <div className="absolute right-[-6rem] top-[-4rem] h-64 w-64 rounded-full bg-[#d85a2f]/14 blur-3xl" />
            <div className="absolute bottom-[-5rem] left-[-4rem] h-64 w-64 rounded-full bg-[#7b93b2]/16 blur-3xl" />

            <div className="relative">
              <span className="inline-flex items-center rounded-full border border-white/55 bg-white/45 px-4 py-2 text-sm font-semibold text-[#d85a2f] backdrop-blur-sm">
                {copy.badge}
              </span>

              <p className="mt-6 max-w-2xl text-2xl font-extrabold leading-tight tracking-[-0.03em] text-[#ff9a67] sm:text-3xl">
                {copy.summary}
              </p>

              <div className="mt-8 grid gap-4">
                {copy.benefits.map((benefit) => {
                  const Icon = benefitIcons[benefit.icon];

                  return (
                    <div
                      key={benefit.title}
                      className="rounded-[28px] border border-white/55 bg-white/45 px-5 py-5 backdrop-blur-sm"
                    >
                      <div className="flex items-start gap-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff1e7] text-[#d85a2f] shadow-[0_12px_30px_rgba(216,90,47,0.18)]">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-base font-extrabold tracking-[-0.02em] text-[#d85a2f]">{benefit.title}</p>
                          <p className="mt-2 text-sm leading-7 text-slate-700">{benefit.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-[36px] border border-white/70 bg-white/88 p-6 shadow-[0_32px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#d85a2f]">{copy.badge}</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-900">{copy.heading}</h2>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 rounded-full bg-[#fff4ec] p-1">
              <button
                type="button"
                onClick={() => setActiveTab("signup")}
                className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
                  activeTab === "signup" ? "bg-[#d85a2f] text-white" : "text-slate-600"
                }`}
              >
                Sign up
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
                  activeTab === "login" ? "bg-[#d85a2f] text-white" : "text-slate-600"
                }`}
              >
                Log in
              </button>
            </div>

            {activeTab === "signup" ? (
              <form className="mt-6 space-y-5" onSubmit={handleSubmit(handleRoleSubmit)}>
                {isClient ? (
                  <>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className={labelClassName} htmlFor="client-name">
                          Name
                        </label>
                        <input
                          id="client-name"
                          autoComplete="given-name"
                          {...register("name", { required: "Name is required." })}
                          className={inputClassName}
                        />
                        {errors.name ? <p className="mt-2 text-sm text-[#d85a2f]">{errors.name.message}</p> : null}
                      </div>

                      <div>
                        <label className={labelClassName} htmlFor="client-surname">
                          Surname
                        </label>
                        <input
                          id="client-surname"
                          autoComplete="family-name"
                          {...register("surname", { required: "Surname is required." })}
                          className={inputClassName}
                        />
                        {errors.surname ? (
                          <p className="mt-2 text-sm text-[#d85a2f]">{errors.surname.message}</p>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <label className={labelClassName} htmlFor="client-email">
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
                            message: "Enter a valid email address."
                          }
                        })}
                        className={inputClassName}
                      />
                      {errors.universityEmail ? (
                        <p className="mt-2 text-sm text-[#d85a2f]">{errors.universityEmail.message}</p>
                      ) : null}
                    </div>

                    <div>
                      <label className={labelClassName} htmlFor="client-country">
                        Country
                      </label>
                      <div className="relative">
                        <select
                          id="client-country"
                          {...register("country", { required: "Country is required." })}
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
                        <p className="mt-2 text-sm text-[#d85a2f]">{errors.country.message}</p>
                      ) : null}
                    </div>

                    <div>
                      <label className={labelClassName} htmlFor="client-institution">
                        Educational institution
                      </label>
                      <div className="relative">
                        <select
                          id="client-institution"
                          {...register("educationalInstitution", {
                            required: "Educational institution is required."
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
                        <p className="mt-2 text-sm text-[#d85a2f]">{errors.educationalInstitution.message}</p>
                      ) : null}
                    </div>

                    {selectedInstitution === "Other" ? (
                      <div>
                        <label className={labelClassName} htmlFor="client-custom-institution">
                          Other institution
                        </label>
                        <input
                          id="client-custom-institution"
                          {...register("customInstitution", {
                            validate: (value) =>
                              selectedInstitution === "Other" && !value.trim() ? "Write your institution." : true
                          })}
                          className={inputClassName}
                        />
                        {errors.customInstitution ? (
                          <p className="mt-2 text-sm text-[#d85a2f]">{errors.customInstitution.message}</p>
                        ) : null}
                      </div>
                    ) : null}

                    <div>
                      <label className={labelClassName} htmlFor="client-position">
                        Position
                      </label>
                      <div className="relative">
                        <select
                          id="client-position"
                          {...register("position", { required: "Position is required." })}
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
                        <p className="mt-2 text-sm text-[#d85a2f]">{errors.position.message}</p>
                      ) : null}
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className={labelClassName} htmlFor="client-phone">
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
                        <label className={labelClassName} htmlFor="client-password">
                          Password
                        </label>
                        <input
                          id="client-password"
                          type="password"
                          autoComplete="new-password"
                          {...register("password", {
                            required: "Password is required.",
                            minLength: {
                              value: 8,
                              message: "Password must be at least 8 characters."
                            }
                          })}
                          className={inputClassName}
                        />
                        {errors.password ? (
                          <p className="mt-2 text-sm text-[#d85a2f]">{errors.password.message}</p>
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className={labelClassName} htmlFor="community-name">
                          Name
                        </label>
                        <input
                          id="community-name"
                          autoComplete="given-name"
                          {...register("name", { required: "Name is required." })}
                          className={inputClassName}
                        />
                        {errors.name ? <p className="mt-2 text-sm text-[#d85a2f]">{errors.name.message}</p> : null}
                      </div>

                      <div>
                        <label className={labelClassName} htmlFor="community-surname">
                          Surname
                        </label>
                        <input
                          id="community-surname"
                          autoComplete="family-name"
                          {...register("surname", { required: "Surname is required." })}
                          className={inputClassName}
                        />
                        {errors.surname ? (
                          <p className="mt-2 text-sm text-[#d85a2f]">{errors.surname.message}</p>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <label className={labelClassName} htmlFor="community-email">
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
                            message: "Enter a valid email address."
                          }
                        })}
                        className={inputClassName}
                      />
                      {errors.email ? <p className="mt-2 text-sm text-[#d85a2f]">{errors.email.message}</p> : null}
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className={labelClassName} htmlFor="community-age">
                          Age span
                        </label>
                        <div className="relative">
                          <select
                            id="community-age"
                            {...register("ageSpan", { required: "Age span is required." })}
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
                        {errors.ageSpan ? <p className="mt-2 text-sm text-[#d85a2f]">{errors.ageSpan.message}</p> : null}
                      </div>

                      <div>
                        <label className={labelClassName} htmlFor="community-gender">
                          Gender
                        </label>
                        <div className="relative">
                          <select
                            id="community-gender"
                            {...register("gender", { required: "Gender is required." })}
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
                        {errors.gender ? <p className="mt-2 text-sm text-[#d85a2f]">{errors.gender.message}</p> : null}
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className={labelClassName} htmlFor="community-salary">
                          Salary range (USD)
                        </label>
                        <div className="relative">
                          <select
                            id="community-salary"
                            {...register("salaryRange", { required: "Salary range is required." })}
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
                          <p className="mt-2 text-sm text-[#d85a2f]">{errors.salaryRange.message}</p>
                        ) : null}
                      </div>

                      <div>
                        <label className={labelClassName} htmlFor="community-education">
                          Educational level
                        </label>
                        <div className="relative">
                          <select
                            id="community-education"
                            {...register("educationalLevel", { required: "Educational level is required." })}
                            className={`${inputClassName} appearance-none pr-11`}
                          >
                            <option value="">Select educational level</option>
                            {educationLevelOptions.map((educationLevel) => (
                              <option key={educationLevel} value={educationLevel}>
                                {educationLevel}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                        {errors.educationalLevel ? (
                          <p className="mt-2 text-sm text-[#d85a2f]">{errors.educationalLevel.message}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className={labelClassName} htmlFor="community-country">
                          Country
                        </label>
                        <div className="relative">
                          <select
                            id="community-country"
                            {...register("country", { required: "Country is required." })}
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
                          <p className="mt-2 text-sm text-[#d85a2f]">{errors.country.message}</p>
                        ) : null}
                      </div>

                      <div>
                        <label className={labelClassName} htmlFor="community-residence">
                          Place of residence
                        </label>
                        <div className="relative">
                          <select
                            id="community-residence"
                            {...register("placeOfResidence", { required: "Place of residence is required." })}
                            className={`${inputClassName} appearance-none pr-11`}
                          >
                            <option value="">Select place of residence</option>
                            {residenceOptions.map((placeOfResidence) => (
                              <option key={placeOfResidence} value={placeOfResidence}>
                                {placeOfResidence}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                        {errors.placeOfResidence ? (
                          <p className="mt-2 text-sm text-[#d85a2f]">{errors.placeOfResidence.message}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className={labelClassName} htmlFor="community-family-status">
                          Family status
                        </label>
                        <div className="relative">
                          <select
                            id="community-family-status"
                            {...register("familyStatus", { required: "Family status is required." })}
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
                          <p className="mt-2 text-sm text-[#d85a2f]">{errors.familyStatus.message}</p>
                        ) : null}
                      </div>

                      <div>
                        <label className={labelClassName} htmlFor="community-car-count">
                          Car count
                        </label>
                        <div className="relative">
                          <select
                            id="community-car-count"
                            {...register("carCount", { required: "Car count is required." })}
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
                          <p className="mt-2 text-sm text-[#d85a2f]">{errors.carCount.message}</p>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <label className={labelClassName}>Interests</label>
                      <Controller
                        control={control}
                        name="interests"
                        rules={{
                          validate: (value) =>
                            value.length > 0 ? true : "Select at least 1 interest. You can choose up to 3."
                        }}
                        render={({ field }) => (
                          <div className="rounded-[28px] border border-[#ead9cc] bg-[#fffdf9] p-4">
                            <button
                              type="button"
                              onClick={() => setInterestsOpen((current) => !current)}
                              className="flex w-full items-center justify-between rounded-2xl bg-[#fff7f1] px-4 py-3 text-left text-sm font-semibold text-slate-700"
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
                                  const selected = field.value.includes(interest);
                                  const disabled = !selected && field.value.length >= 3;

                                  return (
                                    <button
                                      key={interest}
                                      type="button"
                                      onClick={() => {
                                        if (selected) {
                                          field.onChange(field.value.filter((value) => value !== interest));
                                          return;
                                        }

                                        if (field.value.length < 3) {
                                          field.onChange([...field.value, interest]);
                                        }
                                      }}
                                      disabled={disabled}
                                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                                        selected
                                          ? "border-[#d85a2f] bg-[#fff2ea] text-[#d85a2f]"
                                          : disabled
                                            ? "border-[#efe3da] bg-[#faf6f2] text-slate-300"
                                            : "border-[#efe3da] bg-white text-slate-600 hover:border-[#d85a2f]/35 hover:text-[#d85a2f]"
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
                                    className="inline-flex items-center rounded-full bg-[#fff2ea] px-3 py-1 text-xs font-semibold text-[#d85a2f]"
                                  >
                                    {interest}
                                  </span>
                                ))}
                              </div>
                            ) : null}

                            <p className="mt-3 text-sm text-slate-500">Maximum 3 choices.</p>
                          </div>
                        )}
                      />
                      {errors.interests ? (
                        <p className="mt-2 text-sm text-[#d85a2f]">{errors.interests.message}</p>
                      ) : null}
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className={labelClassName} htmlFor="community-phone">
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
                        <label className={labelClassName} htmlFor="community-password">
                          Password
                        </label>
                        <input
                          id="community-password"
                          type="password"
                          autoComplete="new-password"
                          {...register("password", {
                            required: "Password is required.",
                            minLength: {
                              value: 8,
                              message: "Password must be at least 8 characters."
                            }
                          })}
                          className={inputClassName}
                        />
                        {errors.password ? (
                          <p className="mt-2 text-sm text-[#d85a2f]">{errors.password.message}</p>
                        ) : null}
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-[#d85a2f] px-5 py-4 text-base font-bold text-white shadow-[0_20px_40px_rgba(216,90,47,0.2)] transition hover:bg-[#bf4c25]"
                >
                  {copy.submitLabel}
                </button>
              </form>
            ) : (
              <form className="mt-6 space-y-5" onSubmit={handleLoginSubmit(handleRoleLogin)}>
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
                        message: "Enter a valid email address."
                      }
                    })}
                    className={inputClassName}
                  />
                  {loginErrors.email ? (
                    <p className="mt-2 text-sm text-[#d85a2f]">{loginErrors.email.message}</p>
                  ) : null}
                </div>

                <div>
                  <label className={labelClassName} htmlFor="login-password">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    {...registerLogin("password", { required: "Password is required." })}
                    className={inputClassName}
                  />
                  {loginErrors.password ? (
                    <p className="mt-2 text-sm text-[#d85a2f]">{loginErrors.password.message}</p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-[#d85a2f] px-5 py-4 text-base font-bold text-white shadow-[0_20px_40px_rgba(216,90,47,0.2)] transition hover:bg-[#bf4c25]"
                >
                  Log in
                </button>
              </form>
            )}

            {submitMessage ? (
              <div className="mt-5 rounded-2xl border border-[#f0dfd3] bg-[#fff7f1] px-4 py-3 text-sm text-slate-600">
                {submitMessage}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
