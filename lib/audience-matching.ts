import type { SurveyAudience } from "@/lib/dashboard-data";
import { areCommunityCountriesEquivalent } from "@/lib/community-distribution";

export type CommunityAudienceProfile = {
  age: number;
  country: string;
  gender: string;
  education: string;
  interests: string[];
  salaryRange: string;
  residence: string;
  familyStatus: string;
};

type CommunityAudienceSource = {
  ageSpan?: string | null;
  country?: string | null;
  gender?: string | null;
  education?: string | null;
  interests?: string[] | null;
  salaryRange?: string | null;
  residence?: string | null;
  familyStatus?: string | null;
};

export type AudienceMatchTier = "country_priority" | "demographic_fallback" | "none";

export type AudienceMatchResult = {
  matchesCountry: boolean;
  matchesAge: boolean;
  matchesGender: boolean;
  matchesEducation: boolean;
  matchesInterests: boolean;
  matchesSalary: boolean;
  matchesResidence: boolean;
  matchesFamilyStatus: boolean;
  matchesCoreDemographics: boolean;
  matchesSocioEconomic: boolean;
  score: number;
  tier: AudienceMatchTier;
  isQualified: boolean;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function extractNumbers(value: string) {
  return (value.match(/\d[\d,]*/g) ?? []).map((item) => Number(item.replace(/,/g, "")));
}

const orderedEducationBuckets = [
  "uneducated",
  "high_school",
  "undergraduate",
  "bachelors",
  "masters",
  "doctorate"
] as const;

type EducationBucket = (typeof orderedEducationBuckets)[number];

const orderedSalaryBuckets = [
  "up_to_500",
  "up_to_1000",
  "up_to_2500",
  "up_to_5000",
  "up_to_10000",
  "10000_plus"
] as const;

type SalaryBucket = (typeof orderedSalaryBuckets)[number];

function getEducationBucket(value: string): EducationBucket | "any" | null {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue || normalizedValue === "any education level") {
    return "any";
  }

  if (normalizedValue === "uneducated" || normalizedValue === "no formal education") {
    return "uneducated";
  }

  if (
    normalizedValue === "high school" ||
    normalizedValue === "high school diploma" ||
    normalizedValue === "secondary school"
  ) {
    return "high_school";
  }

  if (
    normalizedValue === "undergraduate" ||
    normalizedValue === "associate degree" ||
    normalizedValue === "vocational training"
  ) {
    return "undergraduate";
  }

  if (
    normalizedValue === "bachelor's degree" ||
    normalizedValue === "bachelors degree" ||
    normalizedValue === "bachelor degree"
  ) {
    return "bachelors";
  }

  if (
    normalizedValue === "master's degree" ||
    normalizedValue === "masters degree" ||
    normalizedValue === "master degree"
  ) {
    return "masters";
  }

  if (
    normalizedValue === "doctorate" ||
    normalizedValue === "doctoral degree" ||
    normalizedValue === "phd" ||
    normalizedValue === "ph.d"
  ) {
    return "doctorate";
  }

  return null;
}

function normalizeGender(value: string) {
  const normalizedValue = normalizeText(value);
  return normalizedValue === "all genders" ? "any" : normalizedValue;
}

function normalizeResidence(value: string) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue || normalizedValue === "any residence type") {
    return "any";
  }

  if (normalizedValue.includes("suburban")) {
    return "suburban";
  }

  if (normalizedValue.includes("urban") || normalizedValue.startsWith("city")) {
    return "urban";
  }

  if (normalizedValue.includes("village") || normalizedValue.includes("rural")) {
    return "village";
  }

  if (normalizedValue === "town") {
    return "town";
  }

  return normalizedValue;
}

function normalizeFamilyStatus(value: string) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue || normalizedValue === "any family status") {
    return "any";
  }

  if (normalizedValue === "partnered" || normalizedValue === "in a relationship") {
    return "partnered";
  }

  if (normalizedValue === "parent / guardian" || normalizedValue === "parent/guardian") {
    return "parent_guardian";
  }

  return normalizedValue;
}

function getSalaryBucket(value: string): SalaryBucket | "any" | null {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue || normalizedValue === "all salary ranges") {
    return "any";
  }

  if (normalizedValue === "$10,000+" || normalizedValue === "10000+" || normalizedValue.includes("+")) {
    return "10000_plus";
  }

  if (normalizedValue === "up to $500") {
    return "up_to_500";
  }

  if (normalizedValue === "up to $1,000") {
    return "up_to_1000";
  }

  if (normalizedValue === "up to $2,500") {
    return "up_to_2500";
  }

  if (normalizedValue === "up to $5,000") {
    return "up_to_5000";
  }

  if (normalizedValue === "up to $10,000") {
    return "up_to_10000";
  }

  const values = extractNumbers(normalizedValue);

  if (values.length === 0) {
    return null;
  }

  const upperBound = Math.max(...values);

  if (upperBound <= 500) {
    return "up_to_500";
  }

  if (upperBound <= 1000) {
    return "up_to_1000";
  }

  if (upperBound <= 2500) {
    return "up_to_2500";
  }

  if (upperBound <= 5000) {
    return "up_to_5000";
  }

  if (upperBound <= 10000) {
    return "up_to_10000";
  }

  return "10000_plus";
}

function normalizeInterest(value: string) {
  const normalizedValue = normalizeText(value);

  switch (normalizedValue) {
    case "online learning":
      return "education";
    case "career growth":
    case "entrepreneurship":
      return "business";
    case "research":
      return "science";
    case "entertainment":
      return "media_and_entertainment";
    case "sustainability":
      return "environment";
    case "art & design":
      return "art_and_design";
    case "media and entertainment":
      return "media_and_entertainment";
    case "politics & society":
      return "politics_and_society";
    default:
      return normalizedValue
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
  }
}

function matchesEducation(audienceValue: string, memberValue: string) {
  const audienceBucket = getEducationBucket(audienceValue);

  if (audienceBucket === "any") {
    return true;
  }

  const memberBucket = getEducationBucket(memberValue);

  if (!audienceBucket || !memberBucket) {
    return normalizeText(audienceValue) === normalizeText(memberValue);
  }

  if (audienceBucket === "uneducated") {
    return memberBucket === "uneducated";
  }

  if (memberBucket === "any") {
    return false;
  }

  if (memberBucket === "uneducated") {
    return false;
  }

  return (
    orderedEducationBuckets.indexOf(memberBucket) <=
    orderedEducationBuckets.indexOf(audienceBucket)
  );
}

function matchesFamilyStatus(audienceValue: string, memberValue: string) {
  const normalizedAudience = normalizeFamilyStatus(audienceValue);

  if (normalizedAudience === "any") {
    return true;
  }

  if (normalizedAudience === "parent_guardian") {
    return normalizeFamilyStatus(memberValue) === "parent_guardian";
  }

  return normalizedAudience === normalizeFamilyStatus(memberValue);
}

function matchesInterest(audienceInterests: string[], memberInterests: string[]) {
  if (audienceInterests.length === 0) {
    return true;
  }

  const normalizedMemberInterests = new Set(
    memberInterests.map((interest) => normalizeInterest(interest)).filter(Boolean)
  );

  return audienceInterests.some((interest) => normalizedMemberInterests.has(normalizeInterest(interest)));
}

function matchesSalaryRange(audienceValue: string, memberValue: string) {
  const audienceBucket = getSalaryBucket(audienceValue);

  if (audienceBucket === "any") {
    return true;
  }

  const memberBucket = getSalaryBucket(memberValue);

  if (!audienceBucket || !memberBucket) {
    return normalizeText(audienceValue) === normalizeText(memberValue);
  }

  if (audienceBucket === "10000_plus") {
    return memberBucket === "10000_plus";
  }

  if (memberBucket === "any") {
    return false;
  }

  if (memberBucket === "10000_plus") {
    return false;
  }

  return (
    orderedSalaryBuckets.indexOf(memberBucket) <=
    orderedSalaryBuckets.indexOf(audienceBucket)
  );
}

export function parseAgeSpanMidpoint(ageSpan: string) {
  const matches = ageSpan.match(/\d+/g);

  if (!matches || matches.length === 0) {
    return 0;
  }

  if (matches.length === 1) {
    return Number(matches[0]);
  }

  const minAge = Number(matches[0]);
  const maxAge = Number(matches[1]);
  return Math.round((minAge + maxAge) / 2);
}

export function buildCommunityAudienceProfile(source: CommunityAudienceSource): CommunityAudienceProfile {
  return {
    age: parseAgeSpanMidpoint(source.ageSpan ?? ""),
    country: source.country ?? "",
    gender: source.gender ?? "",
    education: source.education ?? "",
    interests: source.interests ?? [],
    salaryRange: source.salaryRange ?? "",
    residence: source.residence ?? "",
    familyStatus: source.familyStatus ?? ""
  };
}

function buildAudienceMatchScore(result: {
  matchesCountry: boolean;
  matchesAge: boolean;
  matchesGender: boolean;
  matchesEducation: boolean;
  matchesInterests: boolean;
  matchesSalary: boolean;
  matchesResidence: boolean;
  matchesFamilyStatus: boolean;
}) {
  return (
    (result.matchesCountry ? 40 : 0) +
    (result.matchesAge ? 15 : 0) +
    (result.matchesGender ? 10 : 0) +
    (result.matchesEducation ? 10 : 0) +
    (result.matchesSalary ? 10 : 0) +
    (result.matchesResidence ? 5 : 0) +
    (result.matchesFamilyStatus ? 5 : 0) +
    (result.matchesInterests ? 5 : 0)
  );
}

export function evaluateSurveyAudienceMatch(
  audience: SurveyAudience | undefined,
  memberProfile: CommunityAudienceProfile,
  options?: { allowCountryFallback?: boolean }
): AudienceMatchResult {
  if (!audience) {
    return {
      matchesCountry: true,
      matchesAge: true,
      matchesGender: true,
      matchesEducation: true,
      matchesInterests: true,
      matchesSalary: true,
      matchesResidence: true,
      matchesFamilyStatus: true,
      matchesCoreDemographics: true,
      matchesSocioEconomic: true,
      score: 100,
      tier: "country_priority",
      isQualified: true
    };
  }

  const matchesCountry =
    audience.countries.length === 0 ||
    audience.countries.some((country) => areCommunityCountriesEquivalent(country, memberProfile.country));
  const matchesAge = memberProfile.age >= audience.ageMin && memberProfile.age <= audience.ageMax;
  const matchesGender =
    normalizeGender(audience.gender) === "any" ||
    normalizeGender(audience.gender) === normalizeGender(memberProfile.gender);
  const matchesEducationValue = matchesEducation(audience.education, memberProfile.education);
  const matchesInterestValue = matchesInterest(audience.interests, memberProfile.interests);
  const matchesSalary = matchesSalaryRange(
    audience.salaryRange ?? "",
    memberProfile.salaryRange
  );
  const matchesResidenceValue =
    normalizeResidence(audience.residence ?? "") === "any" ||
    normalizeResidence(audience.residence ?? "") === normalizeResidence(memberProfile.residence);
  const matchesFamilyValue = matchesFamilyStatus(audience.familyStatus ?? "", memberProfile.familyStatus);
  const matchesCoreDemographics = matchesAge && matchesGender && matchesEducationValue;
  const matchesSocioEconomic = matchesSalary && matchesResidenceValue && matchesFamilyValue;
  const strictCountryMatch = matchesCountry && matchesCoreDemographics && matchesSocioEconomic && matchesInterestValue;
  const demographicFallbackMatch =
    !matchesCountry && matchesCoreDemographics && matchesSocioEconomic && matchesInterestValue;
  const allowCountryFallback = options?.allowCountryFallback ?? false;
  const isQualified = strictCountryMatch || (allowCountryFallback && demographicFallbackMatch);

  return {
    matchesCountry,
    matchesAge,
    matchesGender,
    matchesEducation: matchesEducationValue,
    matchesInterests: matchesInterestValue,
    matchesSalary,
    matchesResidence: matchesResidenceValue,
    matchesFamilyStatus: matchesFamilyValue,
    matchesCoreDemographics,
    matchesSocioEconomic,
    score: buildAudienceMatchScore({
      matchesCountry,
      matchesAge,
      matchesGender,
      matchesEducation: matchesEducationValue,
      matchesInterests: matchesInterestValue,
      matchesSalary,
      matchesResidence: matchesResidenceValue,
      matchesFamilyStatus: matchesFamilyValue
    }),
    tier: strictCountryMatch ? "country_priority" : allowCountryFallback && demographicFallbackMatch ? "demographic_fallback" : "none",
    isQualified
  };
}

export function matchesSurveyAudience(
  audience: SurveyAudience | undefined,
  memberProfile: CommunityAudienceProfile,
  options?: { allowCountryFallback?: boolean }
) {
  return evaluateSurveyAudienceMatch(audience, memberProfile, options).isQualified;
}

type RankedAudienceCandidate<T> = {
  candidate: T;
  memberProfile: CommunityAudienceProfile;
  match: AudienceMatchResult;
};

function compareAudienceCandidates<T>(left: RankedAudienceCandidate<T>, right: RankedAudienceCandidate<T>) {
  const tierOrder: Record<AudienceMatchTier, number> = {
    country_priority: 0,
    demographic_fallback: 1,
    none: 2
  };

  if (tierOrder[left.match.tier] !== tierOrder[right.match.tier]) {
    return tierOrder[left.match.tier] - tierOrder[right.match.tier];
  }

  if (left.match.score !== right.match.score) {
    return right.match.score - left.match.score;
  }

  if (left.match.matchesInterests !== right.match.matchesInterests) {
    return Number(right.match.matchesInterests) - Number(left.match.matchesInterests);
  }

  return 0;
}

export function prioritizeAudienceCandidates<T>(
  audience: SurveyAudience | undefined,
  candidates: T[],
  getMemberProfile: (candidate: T) => CommunityAudienceProfile,
  targetResponses = 0,
  options?: { allowCountryFallback?: boolean }
) {
  const allowCountryFallback = options?.allowCountryFallback ?? false;
  const evaluatedCandidates = candidates
    .map((candidate) => {
      const memberProfile = getMemberProfile(candidate);

      return {
        candidate,
        memberProfile,
        match: evaluateSurveyAudienceMatch(audience, memberProfile, { allowCountryFallback })
      };
    })
    .filter((item) => item.match.isQualified);

  const prioritizedCountryMatches = evaluatedCandidates
    .filter((item) => item.match.tier === "country_priority")
    .sort(compareAudienceCandidates);

  if (
    !audience ||
    audience.countries.length === 0 ||
    !allowCountryFallback ||
    prioritizedCountryMatches.length >= targetResponses
  ) {
    return prioritizedCountryMatches.map((item) => item.candidate);
  }

  const fallbackCandidates = evaluatedCandidates
    .filter((item) => item.match.tier === "demographic_fallback")
    .sort(compareAudienceCandidates);
  const fallbackSlots = Math.max(0, targetResponses - prioritizedCountryMatches.length);

  return [...prioritizedCountryMatches, ...fallbackCandidates.slice(0, fallbackSlots)].map((item) => item.candidate);
}

export function buildAudienceCriteriaEntries(audience: SurveyAudience) {
  const entries = [
    {
      label: "Research area",
      value: audience.researchArea
    },
    {
      label: "Age range",
      value: `${audience.ageMin}-${audience.ageMax}`
    }
  ];

  if (audience.generalAudience || audience.countries.length === 0) {
    entries.push({
      label: "Audience",
      value: "General Audience"
    });
  } else if (audience.countries.length > 0) {
    entries.push({
      label: "Countries",
      value: audience.countries.join(", ")
    });
  }

  if (audience.gender && audience.gender !== "All genders") {
    entries.push({
      label: "Gender",
      value: audience.gender
    });
  }

  if (audience.education && audience.education !== "Any education level") {
    entries.push({
      label: "Education",
      value: audience.education
    });
  }

  if (audience.salaryRange && audience.salaryRange !== "All salary ranges") {
    entries.push({
      label: "Income range",
      value: audience.salaryRange
    });
  }

  if (audience.residence && audience.residence !== "Any residence type") {
    entries.push({
      label: "Residence",
      value: audience.residence
    });
  }

  if (audience.familyStatus && audience.familyStatus !== "Any family status") {
    entries.push({
      label: "Family status",
      value: audience.familyStatus
    });
  }

  if (audience.interests.length > 0) {
    entries.push({
      label: "Interests",
      value: audience.interests.join(", ")
    });
  }

  return entries;
}
