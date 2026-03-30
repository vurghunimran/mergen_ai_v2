import type { SurveyAudience } from "@/lib/dashboard-data";
import {
  getCommunityLaunchRegionByCountry,
  normalizeCommunityLaunchCountries
} from "@/lib/community-distribution";

export type SurveyDistributionStage = 1 | 2 | 3 | 4;

const MILLISECONDS_IN_HOUR = 60 * 60 * 1000;
const MILLISECONDS_IN_DAY = 24 * MILLISECONDS_IN_HOUR;

function addMilliseconds(date: Date, milliseconds: number) {
  return new Date(date.getTime() + milliseconds);
}

function isValidDate(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

function clampStage(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(4, Math.round(value)));
}

export function getSurveyActiveWindowDays(targetResponses: number) {
  if (targetResponses >= 1000) {
    return 7;
  }

  if (targetResponses >= 500) {
    return 5;
  }

  return 3;
}

export function buildSurveyRolloutWindow(targetResponses: number, now = new Date()) {
  const activeDays = getSurveyActiveWindowDays(targetResponses);
  const startedAt = now.toISOString();
  const expiresAt = addMilliseconds(now, activeDays * MILLISECONDS_IN_DAY).toISOString();

  return {
    activeDays,
    startedAt,
    expiresAt
  };
}

export function normalizeSurveyDistributionStage(value: unknown) {
  return clampStage(typeof value === "number" ? value : Number(value));
}

export function calculateSurveyDaysRemaining(
  expiresAt: string | null | undefined,
  fallbackDays: number,
  now = new Date()
) {
  const normalizedExpiresAt = isValidDate(expiresAt) ? expiresAt : null;

  if (!normalizedExpiresAt) {
    return Math.max(0, fallbackDays);
  }

  const diff = new Date(normalizedExpiresAt).getTime() - now.getTime();

  if (diff <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(diff / MILLISECONDS_IN_DAY));
}

export function hasSurveyExpired(expiresAt: string | null | undefined, now = new Date()) {
  const normalizedExpiresAt = isValidDate(expiresAt) ? expiresAt : null;

  if (!normalizedExpiresAt) {
    return false;
  }

  return new Date(normalizedExpiresAt).getTime() <= now.getTime();
}

export function getDueDistributionStage(params: {
  distributionStage: number;
  distributionStartedAt?: string | null;
  distributionLastSentAt?: string | null;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const currentStage = normalizeSurveyDistributionStage(params.distributionStage);
  const startedAt = isValidDate(params.distributionStartedAt ?? null)
    ? new Date(params.distributionStartedAt as string)
    : now;
  const lastSentAt = isValidDate(params.distributionLastSentAt ?? null)
    ? new Date(params.distributionLastSentAt as string)
    : startedAt;

  if (currentStage <= 0) {
    return 1 as SurveyDistributionStage;
  }

  if (currentStage >= 4) {
    return null;
  }

  const dueAt =
    currentStage === 1
      ? addMilliseconds(lastSentAt, 5 * MILLISECONDS_IN_HOUR)
      : addMilliseconds(lastSentAt, MILLISECONDS_IN_DAY);

  if (now.getTime() < dueAt.getTime()) {
    return null;
  }

  return (currentStage + 1) as SurveyDistributionStage;
}

function buildStageThreeAudience(audience: SurveyAudience) {
  return {
    ...audience,
    education: "Any education level",
    interests: [],
    salaryRange: "All salary ranges",
    residence: "Any residence type",
    familyStatus: "Any family status"
  };
}

export function buildStageFourCountries(countries: string[]) {
  const normalizedCountries = normalizeCommunityLaunchCountries(countries);
  const expandedCountries = new Set(normalizedCountries);

  for (const country of normalizedCountries) {
    const region = getCommunityLaunchRegionByCountry(country);

    if (!region) {
      continue;
    }

    for (const regionCountry of region.countries ?? []) {
      expandedCountries.add(regionCountry);
    }
  }

  return [...expandedCountries];
}

export function buildAudienceForDistributionStage(
  audience: SurveyAudience | undefined,
  stage: SurveyDistributionStage
) {
  if (!audience) {
    return audience;
  }

  if (stage === 3) {
    return buildStageThreeAudience(audience);
  }

  if (stage === 4) {
    return {
      ...audience,
      countries: buildStageFourCountries(audience.countries)
    };
  }

  return audience;
}
