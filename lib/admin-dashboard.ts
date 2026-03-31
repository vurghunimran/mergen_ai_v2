import "server-only";
import { ageSpanOptions, genderOptions } from "@/lib/auth-options";
import { getCommunityLaunchRegionByCountry, communityLaunchTotalMembers } from "@/lib/community-distribution";
import { parseSurveyAudience, type SurveyRow } from "@/lib/survey-db";
import {
  calculateSurveyDaysRemaining,
  hasSurveyExpired,
  normalizeSurveyDistributionStage
} from "@/lib/survey-rollout";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ClientProfileRow, CommunityProfileRow } from "@/lib/supabase/types";
import { mapRewardActivationRow, type RewardActivationRow } from "@/lib/reward-activations";

type AdminProfileRow = {
  id: string;
  role: "client" | "community";
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
};

type SurveyResponseSummaryRow = {
  survey_id: number;
  respondent_id: string;
  trust_score: number;
  earned_credits: number;
  completion_time_seconds: number;
  submitted_at: string;
};

type CountBreakdown = {
  label: string;
  count: number;
  percentage: number;
};

export type AdminSurveyRecord = {
  id: number;
  name: string;
  status: string;
  situation: string;
  clientName: string;
  clientEmail: string;
  clientCountry: string;
  institution: string;
  createdAt: string;
  expiresAt: string | null;
  durationDays: number;
  daysRemaining: number;
  questionCount: number;
  responseCount: number;
  targetResponses: number;
  completionRate: number;
  distributionStage: number;
  audienceSummary: string;
};

export type AdminSurveyOverview = {
  activeSurveys: AdminSurveyRecord[];
  activeSurveyCount: number;
  liveResponseCount: number;
  activeClientCount: number;
  expiringSoonCount: number;
  totalSurveyCount: number;
};

export type AdminMemberRecord = {
  id: string;
  name: string;
  email: string;
  country: string;
  ageSpan: string;
  gender: string;
  interests: string[];
  joinedAt: string;
  completionCount: number;
  earnedCredits: number;
  redeemedCredits: number;
};

export type AdminRewardActivationRecord = {
  id: string;
  memberName: string;
  memberEmail: string;
  rewardCompany: string;
  rewardSubtitle: string;
  credits: number;
  status: string;
  activatedAt: string;
};

export type AdminCommunityOverview = {
  totalMembers: number;
  totalClients: number;
  launchCapacity: number;
  surveyCompletionCount: number;
  averageTrustScore: number;
  totalEarnedCredits: number;
  totalRedeemedCredits: number;
  totalRewardActivations: number;
  countries: CountBreakdown[];
  regions: CountBreakdown[];
  ages: CountBreakdown[];
  genders: CountBreakdown[];
  interests: CountBreakdown[];
  rewards: CountBreakdown[];
  recentMembers: AdminMemberRecord[];
  recentRewardActivations: AdminRewardActivationRecord[];
};

function getDisplayName(firstName: string | null, lastName: string | null, email: string) {
  const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return fullName || email;
}

function buildResponseCountBySurveyId(rows: SurveyResponseSummaryRow[]) {
  return rows.reduce<Record<number, number>>((accumulator, row) => {
    accumulator[row.survey_id] = (accumulator[row.survey_id] ?? 0) + 1;
    return accumulator;
  }, {});
}

function buildMemberCreditsById(rows: SurveyResponseSummaryRow[]) {
  return rows.reduce<Record<string, { completions: number; earnedCredits: number }>>((accumulator, row) => {
    const current = accumulator[row.respondent_id] ?? {
      completions: 0,
      earnedCredits: 0
    };

    current.completions += 1;
    current.earnedCredits += row.earned_credits;
    accumulator[row.respondent_id] = current;
    return accumulator;
  }, {});
}

function buildRedeemedCreditsByMemberId(rows: RewardActivationRow[]) {
  return rows.reduce<Record<string, number>>((accumulator, row) => {
    if (row.status === "cancelled") {
      return accumulator;
    }

    accumulator[row.member_id] = (accumulator[row.member_id] ?? 0) + row.credits;
    return accumulator;
  }, {});
}

function buildCountBreakdown(
  values: string[],
  total: number,
  options?: {
    limit?: number;
    preferredOrder?: string[];
  }
) {
  const counts = values.reduce<Record<string, number>>((accumulator, value) => {
    const label = value.trim() || "Not set";
    accumulator[label] = (accumulator[label] ?? 0) + 1;
    return accumulator;
  }, {});

  const entries = Object.entries(counts);
  const preferredOrder = options?.preferredOrder ?? [];
  const orderMap = new Map(preferredOrder.map((label, index) => [label, index]));

  const sortedEntries = entries.sort((left, right) => {
    const leftOrder = orderMap.get(left[0]);
    const rightOrder = orderMap.get(right[0]);

    if (leftOrder !== undefined && rightOrder !== undefined && leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    if (leftOrder !== undefined) {
      return -1;
    }

    if (rightOrder !== undefined) {
      return 1;
    }

    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return left[0].localeCompare(right[0]);
  });

  return sortedEntries.slice(0, options?.limit ?? sortedEntries.length).map(([label, count]) => ({
    label,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0
  }));
}

function buildAudienceSummary(survey: SurveyRow) {
  const audience = parseSurveyAudience(survey.audience);

  if (!audience) {
    return "General audience";
  }

  const parts = [
    audience.countries.length > 0 ? `${audience.countries.length} country target` : "",
    audience.gender ? audience.gender : "",
    audience.ageMin > 0 || audience.ageMax > 0
      ? `Ages ${audience.ageMin || 18}-${audience.ageMax || 99}`
      : "",
    audience.interests.length > 0 ? `${audience.interests.length} interest filters` : ""
  ].filter(Boolean);

  return parts.join(" • ") || "General audience";
}

function isMissingRewardActivationTableError(error: { message?: string; details?: string } | null) {
  const combinedMessage = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();

  return (
    combinedMessage.includes("reward_activations") &&
    (combinedMessage.includes("does not exist") || combinedMessage.includes("could not find"))
  );
}

export async function getAdminSurveyOverview(): Promise<AdminSurveyOverview> {
  const admin = createAdminClient();
  const now = new Date();

  const [
    { data: surveyData, error: surveyError },
    { data: responseData, error: responseError },
    { data: profileData, error: profileError },
    { data: clientProfileData, error: clientProfileError }
  ] = await Promise.all([
    admin.from("surveys").select("*").order("created_at", { ascending: false }),
    admin
      .from("survey_responses")
      .select("survey_id,respondent_id,trust_score,earned_credits,completion_time_seconds,submitted_at"),
    admin.from("profiles").select("id,role,email,first_name,last_name,created_at"),
    admin.from("client_profiles").select("id,country,educational_institution,position")
  ]);

  if (surveyError) {
    throw surveyError;
  }

  if (responseError) {
    throw responseError;
  }

  if (profileError) {
    throw profileError;
  }

  if (clientProfileError) {
    throw clientProfileError;
  }

  const responseCountBySurveyId = buildResponseCountBySurveyId(
    (responseData ?? []) as SurveyResponseSummaryRow[]
  );
  const profilesById = new Map(
    ((profileData ?? []) as AdminProfileRow[]).map((row) => [row.id, row])
  );
  const clientProfilesById = new Map(
    ((clientProfileData ?? []) as ClientProfileRow[]).map((row) => [row.id, row])
  );

  const activeSurveys = ((surveyData ?? []) as SurveyRow[])
    .map((survey) => {
      const responseCount = responseCountBySurveyId[survey.id] ?? 0;
      const daysRemaining = calculateSurveyDaysRemaining(
        survey.distribution_expires_at,
        survey.days_remaining,
        now
      );
      const isExpired = hasSurveyExpired(survey.distribution_expires_at, now);
      const clientProfile = clientProfilesById.get(survey.user_id);
      const ownerProfile = profilesById.get(survey.user_id);
      const isTargetReached = responseCount >= survey.target_responses;
      const isActive = survey.status === "published" && !isExpired && !isTargetReached;

      if (!isActive) {
        return null;
      }

      return {
        id: survey.id,
        name: survey.name,
        status: "Active",
        situation: `Stage ${Math.max(1, normalizeSurveyDistributionStage(survey.distribution_stage))} live`,
        clientName: ownerProfile
          ? getDisplayName(ownerProfile.first_name, ownerProfile.last_name, ownerProfile.email)
          : "Unknown client",
        clientEmail: ownerProfile?.email ?? "Unknown",
        clientCountry: clientProfile?.country ?? "Not set",
        institution: clientProfile?.educational_institution ?? "Not set",
        createdAt: survey.created_at,
        expiresAt: survey.distribution_expires_at ?? null,
        durationDays: survey.distribution_window_days ?? survey.days_remaining,
        daysRemaining,
        questionCount: survey.question_count ?? 0,
        responseCount,
        targetResponses: survey.target_responses,
        completionRate:
          survey.target_responses > 0 ? Math.min(100, Math.round((responseCount / survey.target_responses) * 100)) : 0,
        distributionStage: Math.max(1, normalizeSurveyDistributionStage(survey.distribution_stage)),
        audienceSummary: buildAudienceSummary(survey)
      } satisfies AdminSurveyRecord;
    })
    .filter((survey): survey is AdminSurveyRecord => Boolean(survey))
    .sort((left, right) => left.daysRemaining - right.daysRemaining || left.id - right.id);

  return {
    activeSurveys,
    activeSurveyCount: activeSurveys.length,
    liveResponseCount: activeSurveys.reduce((sum, survey) => sum + survey.responseCount, 0),
    activeClientCount: new Set(activeSurveys.map((survey) => survey.clientEmail)).size,
    expiringSoonCount: activeSurveys.filter((survey) => survey.daysRemaining <= 1).length,
    totalSurveyCount: (surveyData ?? []).length
  };
}

export async function getAdminCommunityOverview(): Promise<AdminCommunityOverview> {
  const admin = createAdminClient();

  const [
    { data: profileData, error: profileError },
    { data: communityData, error: communityError },
    { data: responseData, error: responseError },
    { data: rewardData, error: rewardError }
  ] = await Promise.all([
    admin.from("profiles").select("id,role,email,first_name,last_name,created_at"),
    admin
      .from("community_profiles")
      .select(
        "id,country,age_span,gender,employment_status,industry,salary_range,educational_level,field_of_study,language_skills,english_proficiency,place_of_residence,family_status,household_size,children_count,interests,car_count"
      ),
    admin
      .from("survey_responses")
      .select("survey_id,respondent_id,trust_score,earned_credits,completion_time_seconds,submitted_at"),
    admin
      .from("reward_activations")
      .select("id,member_id,reward_id,reward_company,reward_subtitle,activation_email,credits,status,activated_at")
      .order("activated_at", { ascending: false })
  ]);

  if (profileError) {
    throw profileError;
  }

  if (communityError) {
    throw communityError;
  }

  if (responseError) {
    throw responseError;
  }

  if (rewardError && !isMissingRewardActivationTableError(rewardError)) {
    throw rewardError;
  }

  const profileRows = (profileData ?? []) as AdminProfileRow[];
  const communityRows = (communityData ?? []) as CommunityProfileRow[];
  const responseRows = (responseData ?? []) as SurveyResponseSummaryRow[];
  const rewardRows = rewardError ? [] : ((rewardData ?? []) as RewardActivationRow[]);

  const communityProfilesById = new Map(communityRows.map((row) => [row.id, row]));
  const communityMembers = profileRows.filter(
    (row) => row.role === "community" && communityProfilesById.has(row.id)
  );
  const memberProgressById = buildMemberCreditsById(responseRows);
  const redeemedCreditsByMemberId = buildRedeemedCreditsByMemberId(rewardRows);
  const mappedRewardActivations = rewardRows.map(mapRewardActivationRow);
  const activeRewardActivations = mappedRewardActivations.filter(
    (activation) => activation.status !== "cancelled"
  );

  const recentMembers = communityMembers
    .map((member) => {
      const communityProfile = communityProfilesById.get(member.id);
      const memberProgress = memberProgressById[member.id];

      return {
        id: member.id,
        name: getDisplayName(member.first_name, member.last_name, member.email),
        email: member.email,
        country: communityProfile?.country ?? "Not set",
        ageSpan: communityProfile?.age_span ?? "Not set",
        gender: communityProfile?.gender ?? "Not set",
        interests: communityProfile?.interests ?? [],
        joinedAt: member.created_at,
        completionCount: memberProgress?.completions ?? 0,
        earnedCredits: memberProgress?.earnedCredits ?? 0,
        redeemedCredits: redeemedCreditsByMemberId[member.id] ?? 0
      } satisfies AdminMemberRecord;
    })
    .sort((left, right) => new Date(right.joinedAt).getTime() - new Date(left.joinedAt).getTime())
    .slice(0, 8);

  const profilesById = new Map(profileRows.map((row) => [row.id, row]));
  const recentRewardActivations = activeRewardActivations
    .slice(0, 8)
    .map((activation) => {
      const member = profilesById.get(activation.memberId);
      const memberName = member
        ? getDisplayName(member.first_name, member.last_name, member.email)
        : activation.activationEmail;

      return {
        id: activation.id,
        memberName,
        memberEmail: member?.email ?? activation.activationEmail,
        rewardCompany: activation.rewardCompany,
        rewardSubtitle: activation.rewardSubtitle,
        credits: activation.credits,
        status: activation.status,
        activatedAt: activation.activatedAt
      } satisfies AdminRewardActivationRecord;
    });

  const countryValues = communityMembers.map(
    (member) => communityProfilesById.get(member.id)?.country ?? "Not set"
  );
  const regionValues = countryValues.map((country) => {
    const region = getCommunityLaunchRegionByCountry(country);
    return region?.label ?? "Outside launch map";
  });
  const ageValues = communityMembers.map(
    (member) => communityProfilesById.get(member.id)?.age_span ?? "Not set"
  );
  const genderValues = communityMembers.map(
    (member) => communityProfilesById.get(member.id)?.gender ?? "Not set"
  );
  const interestValues = communityMembers.flatMap(
    (member) => communityProfilesById.get(member.id)?.interests ?? ["Not set"]
  );

  const totalTrustScore = responseRows.reduce((sum, row) => sum + row.trust_score, 0);
  const totalEarnedCredits = responseRows.reduce((sum, row) => sum + row.earned_credits, 0);
  const totalRedeemedCredits = activeRewardActivations.reduce(
    (sum, activation) => sum + activation.credits,
    0
  );

  return {
    totalMembers: communityMembers.length,
    totalClients: profileRows.filter((profile) => profile.role === "client").length,
    launchCapacity: communityLaunchTotalMembers,
    surveyCompletionCount: responseRows.length,
    averageTrustScore: responseRows.length > 0 ? Math.round(totalTrustScore / responseRows.length) : 0,
    totalEarnedCredits,
    totalRedeemedCredits,
    totalRewardActivations: activeRewardActivations.length,
    countries: buildCountBreakdown(countryValues, communityMembers.length, { limit: 8 }),
    regions: buildCountBreakdown(regionValues, communityMembers.length, { limit: 8 }),
    ages: buildCountBreakdown(ageValues, communityMembers.length, { preferredOrder: [...ageSpanOptions] }),
    genders: buildCountBreakdown(genderValues, communityMembers.length, {
      preferredOrder: [...genderOptions]
    }),
    interests: buildCountBreakdown(interestValues, communityMembers.length, { limit: 8 }),
    rewards: buildCountBreakdown(
      activeRewardActivations.map((activation) => activation.rewardCompany),
      Math.max(activeRewardActivations.length, 1),
      { limit: 8 }
    ),
    recentMembers,
    recentRewardActivations
  };
}
