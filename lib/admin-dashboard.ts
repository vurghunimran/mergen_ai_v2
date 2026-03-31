import "server-only";
import { ageSpanOptions, genderOptions } from "@/lib/auth-options";
import { getCommunityLaunchRegionByCountry, communityLaunchTotalMembers } from "@/lib/community-distribution";
import { parseSurveyAudience, type SurveyRow } from "@/lib/survey-db";
import { previewUpcomingSurveyDelivery } from "@/lib/survey-distribution";
import {
  calculateSurveyDaysRemaining,
  hasSurveyExpired,
  normalizeSurveyDistributionStage,
  type SurveyDistributionStage
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

type SurveyNotificationRow = {
  survey_id: number;
  recipient_id: string;
  recipient_email: string;
  stage: number;
  sent_at: string;
};

type CountBreakdown = {
  label: string;
  count: number;
  percentage: number;
};

export type AdminSurveyRecipientRecord = {
  id: string;
  name: string;
  email: string;
  country: string;
  ageSpan: string;
  gender: string;
  sentAt: string;
  stage: number;
};

export type AdminPlannedSurveyRecipientRecord = {
  id: string;
  name: string;
  email: string;
  country: string;
  ageSpan: string;
  gender: string;
  completionCount: number;
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
  notifiedMembersCount: number;
  notifiedRecipients: AdminSurveyRecipientRecord[];
  plannedStage: SurveyDistributionStage | null;
  plannedStatus: "ready" | "scheduled" | "completed";
  plannedFor: string | null;
  plannedRecipients: AdminPlannedSurveyRecipientRecord[];
};

export type AdminSurveyOverview = {
  activeSurveys: AdminSurveyRecord[];
  activeSurveyCount: number;
  liveResponseCount: number;
  totalNotificationsSent: number;
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
  availableCredits: number;
  creditsEarnedYesterday: number;
  creditsEarnedLast7Days: number;
  lastEarnedAt: string | null;
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
  totalAvailableCredits: number;
  totalRewardActivations: number;
  membersWithAvailableCredits: number;
  countries: CountBreakdown[];
  regions: CountBreakdown[];
  ages: CountBreakdown[];
  genders: CountBreakdown[];
  interests: CountBreakdown[];
  rewards: CountBreakdown[];
  recentMembers: AdminMemberRecord[];
  creditBalances: AdminMemberRecord[];
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

function groupNotificationsBySurveyId(rows: SurveyNotificationRow[]) {
  return rows.reduce<Record<number, SurveyNotificationRow[]>>((accumulator, row) => {
    if (!accumulator[row.survey_id]) {
      accumulator[row.survey_id] = [];
    }

    accumulator[row.survey_id].push(row);
    return accumulator;
  }, {});
}

function buildMemberCreditsById(rows: SurveyResponseSummaryRow[]) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const last7DaysStart = new Date(todayStart);
  last7DaysStart.setDate(last7DaysStart.getDate() - 6);

  return rows.reduce<
    Record<
      string,
      {
        completions: number;
        earnedCredits: number;
        earnedYesterday: number;
        earnedLast7Days: number;
        lastEarnedAt: string | null;
      }
    >
  >((accumulator, row) => {
    const current = accumulator[row.respondent_id] ?? {
      completions: 0,
      earnedCredits: 0,
      earnedYesterday: 0,
      earnedLast7Days: 0,
      lastEarnedAt: null
    };

    current.completions += 1;
    current.earnedCredits += row.earned_credits;

    const submittedAt = new Date(row.submitted_at);

    if (!Number.isNaN(submittedAt.getTime())) {
      if (submittedAt >= yesterdayStart && submittedAt < todayStart) {
        current.earnedYesterday += row.earned_credits;
      }

      if (submittedAt >= last7DaysStart) {
        current.earnedLast7Days += row.earned_credits;
      }

      if (!current.lastEarnedAt || submittedAt > new Date(current.lastEarnedAt)) {
        current.lastEarnedAt = row.submitted_at;
      }
    }

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
    { data: clientProfileData, error: clientProfileError },
    { data: communityProfileData, error: communityProfileError },
    { data: notificationData, error: notificationError }
  ] = await Promise.all([
    admin.from("surveys").select("*").order("created_at", { ascending: false }),
    admin
      .from("survey_responses")
      .select("survey_id,respondent_id,trust_score,earned_credits,completion_time_seconds,submitted_at"),
    admin.from("profiles").select("id,role,email,first_name,last_name,created_at"),
    admin.from("client_profiles").select("id,country,educational_institution,position"),
    admin.from("community_profiles").select("id,country,age_span,gender"),
    admin
      .from("survey_notifications")
      .select("survey_id,recipient_id,recipient_email,stage,sent_at")
      .order("sent_at", { ascending: false })
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

  if (communityProfileError) {
    throw communityProfileError;
  }

  if (notificationError) {
    throw notificationError;
  }

  const responseCountBySurveyId = buildResponseCountBySurveyId(
    (responseData ?? []) as SurveyResponseSummaryRow[]
  );
  const notificationsBySurveyId = groupNotificationsBySurveyId(
    (notificationData ?? []) as SurveyNotificationRow[]
  );
  const profilesById = new Map(
    ((profileData ?? []) as AdminProfileRow[]).map((row) => [row.id, row])
  );
  const clientProfilesById = new Map(
    ((clientProfileData ?? []) as ClientProfileRow[]).map((row) => [row.id, row])
  );
  const communityProfilesById = new Map(
    ((communityProfileData ?? []) as CommunityProfileRow[]).map((row) => [row.id, row])
  );

  const activeSurveys = ((surveyData ?? []) as SurveyRow[])
    .map(async (survey) => {
      const responseCount = responseCountBySurveyId[survey.id] ?? 0;
      const notificationRows = notificationsBySurveyId[survey.id] ?? [];
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

      const plannedDelivery = await previewUpcomingSurveyDelivery({
        admin,
        survey,
        now,
        responseCount
      });

      const notifiedRecipients = notificationRows.map((notificationRow) => {
        const recipientProfile = profilesById.get(notificationRow.recipient_id);
        const recipientCommunityProfile = communityProfilesById.get(notificationRow.recipient_id);

        return {
          id: notificationRow.recipient_id,
          name: recipientProfile
            ? getDisplayName(
                recipientProfile.first_name,
                recipientProfile.last_name,
                recipientProfile.email
              )
            : notificationRow.recipient_email,
          email: recipientProfile?.email ?? notificationRow.recipient_email,
          country: recipientCommunityProfile?.country ?? "Not set",
          ageSpan: recipientCommunityProfile?.age_span ?? "Not set",
          gender: recipientCommunityProfile?.gender ?? "Not set",
          sentAt: notificationRow.sent_at,
          stage: notificationRow.stage
        } satisfies AdminSurveyRecipientRecord;
      });

      const plannedRecipients = plannedDelivery.recipients.map((recipient) => ({
        id: recipient.id,
        name: recipient.firstName,
        email: recipient.email,
        country: recipient.country || "Not set",
        ageSpan: recipient.ageSpan || "Not set",
        gender: recipient.gender || "Not set",
        completionCount: recipient.completionCount
      }));

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
        audienceSummary: buildAudienceSummary(survey),
        notifiedMembersCount: notifiedRecipients.length,
        notifiedRecipients,
        plannedStage: plannedDelivery.stage,
        plannedStatus: plannedDelivery.status,
        plannedFor: plannedDelivery.scheduledFor,
        plannedRecipients
      } satisfies AdminSurveyRecord;
    })
    ;

  const resolvedActiveSurveys = (await Promise.all(activeSurveys))
    .filter((survey): survey is AdminSurveyRecord => Boolean(survey))
    .sort((left, right) => left.daysRemaining - right.daysRemaining || left.id - right.id);

  return {
    activeSurveys: resolvedActiveSurveys,
    activeSurveyCount: resolvedActiveSurveys.length,
    liveResponseCount: resolvedActiveSurveys.reduce((sum, survey) => sum + survey.responseCount, 0),
    totalNotificationsSent: resolvedActiveSurveys.reduce((sum, survey) => sum + survey.notifiedMembersCount, 0),
    activeClientCount: new Set(resolvedActiveSurveys.map((survey) => survey.clientEmail)).size,
    expiringSoonCount: resolvedActiveSurveys.filter((survey) => survey.daysRemaining <= 1).length,
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

  const allMemberRecords = communityMembers
    .map((member) => {
      const communityProfile = communityProfilesById.get(member.id);
      const memberProgress = memberProgressById[member.id];
      const earnedCredits = memberProgress?.earnedCredits ?? 0;
      const redeemedCredits = redeemedCreditsByMemberId[member.id] ?? 0;
      const availableCredits = Math.max(0, earnedCredits - redeemedCredits);

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
        earnedCredits,
        redeemedCredits,
        availableCredits,
        creditsEarnedYesterday: memberProgress?.earnedYesterday ?? 0,
        creditsEarnedLast7Days: memberProgress?.earnedLast7Days ?? 0,
        lastEarnedAt: memberProgress?.lastEarnedAt ?? null
      } satisfies AdminMemberRecord;
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  const recentMembers = [...allMemberRecords]
    .sort((left, right) => new Date(right.joinedAt).getTime() - new Date(left.joinedAt).getTime())
    .slice(0, 8);

  const creditBalances = allMemberRecords
    .filter((member) => member.availableCredits > 0)
    .sort((left, right) => {
      if (right.creditsEarnedLast7Days !== left.creditsEarnedLast7Days) {
        return right.creditsEarnedLast7Days - left.creditsEarnedLast7Days;
      }

      if (right.availableCredits !== left.availableCredits) {
        return right.availableCredits - left.availableCredits;
      }

      return new Date(right.lastEarnedAt ?? 0).getTime() - new Date(left.lastEarnedAt ?? 0).getTime();
    })
    .slice(0, 10);

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
  const totalAvailableCredits = Math.max(0, totalEarnedCredits - totalRedeemedCredits);

  return {
    totalMembers: communityMembers.length,
    totalClients: profileRows.filter((profile) => profile.role === "client").length,
    launchCapacity: communityLaunchTotalMembers,
    surveyCompletionCount: responseRows.length,
    averageTrustScore: responseRows.length > 0 ? Math.round(totalTrustScore / responseRows.length) : 0,
    totalEarnedCredits,
    totalRedeemedCredits,
    totalAvailableCredits,
    totalRewardActivations: activeRewardActivations.length,
    membersWithAvailableCredits: creditBalances.length,
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
    creditBalances,
    recentRewardActivations
  };
}
