import type { SurveyAudience } from "@/lib/dashboard-data";

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

function normalizeEducation(value: string) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue || normalizedValue === "any education level") {
    return "any";
  }

  if (normalizedValue === "high school" || normalizedValue === "high school diploma" || normalizedValue === "secondary school") {
    return "high_school";
  }

  if (normalizedValue === "undergraduate") {
    return "undergraduate";
  }

  if (normalizedValue === "associate degree") {
    return "associate";
  }

  if (normalizedValue === "vocational training") {
    return "vocational";
  }

  if (normalizedValue === "bachelor's degree") {
    return "bachelors";
  }

  if (normalizedValue === "master's degree") {
    return "masters";
  }

  if (normalizedValue === "doctorate") {
    return "doctorate";
  }

  return normalizedValue;
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

function normalizeSalaryRange(value: string) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue || normalizedValue === "all salary ranges") {
    return "any";
  }

  if (normalizedValue.includes("+")) {
    return "10000_plus";
  }

  const values = extractNumbers(value);

  if (values.length === 0) {
    return normalizedValue;
  }

  const midpoint = values.length === 1 ? values[0] : (values[0] + values[1]) / 2;

  if (midpoint < 1000) {
    return "under_1000";
  }

  if (midpoint < 5000) {
    return "1000_5000";
  }

  if (midpoint < 10000) {
    return "5000_10000";
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
    case "media and entertainment":
      return "media_and_entertainment";
    default:
      return normalizedValue.replace(/\s+/g, "_");
  }
}

function matchesEducation(audienceValue: string, memberValue: string) {
  const normalizedAudience = normalizeEducation(audienceValue);

  if (normalizedAudience === "any") {
    return true;
  }

  const normalizedMember = normalizeEducation(memberValue);

  if (normalizedAudience === "undergraduate") {
    return ["undergraduate", "associate", "vocational", "bachelors"].includes(normalizedMember);
  }

  return normalizedAudience === normalizedMember;
}

function matchesFamilyStatus(audienceValue: string, memberValue: string) {
  const normalizedAudience = normalizeFamilyStatus(audienceValue);

  if (normalizedAudience === "any") {
    return true;
  }

  if (normalizedAudience === "parent_guardian") {
    return true;
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
    audience.countries.some((country) => normalizeText(country) === normalizeText(memberProfile.country));
  const matchesAge = memberProfile.age >= audience.ageMin && memberProfile.age <= audience.ageMax;
  const matchesGender =
    normalizeGender(audience.gender) === "any" ||
    normalizeGender(audience.gender) === normalizeGender(memberProfile.gender);
  const matchesEducationValue = matchesEducation(audience.education, memberProfile.education);
  const matchesInterestValue = matchesInterest(audience.interests, memberProfile.interests);
  const matchesSalary =
    normalizeSalaryRange(audience.salaryRange ?? "") === "any" ||
    normalizeSalaryRange(audience.salaryRange ?? "") === normalizeSalaryRange(memberProfile.salaryRange);
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
  targetResponses = 0
) {
  const evaluatedCandidates = candidates
    .map((candidate) => {
      const memberProfile = getMemberProfile(candidate);

      return {
        candidate,
        memberProfile,
        match: evaluateSurveyAudienceMatch(audience, memberProfile, { allowCountryFallback: true })
      };
    })
    .filter((item) => item.match.isQualified);

  const prioritizedCountryMatches = evaluatedCandidates
    .filter((item) => item.match.tier === "country_priority")
    .sort(compareAudienceCandidates);

  if (!audience || audience.countries.length === 0 || prioritizedCountryMatches.length >= targetResponses) {
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

  if (audience.countries.length > 0) {
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
