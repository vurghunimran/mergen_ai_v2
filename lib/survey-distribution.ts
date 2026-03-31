import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCommunityAudienceProfile,
  evaluateSurveyAudienceMatch,
  type CommunityAudienceProfile
} from "@/lib/audience-matching";
import { buildSurveyLaunchEmail } from "@/lib/email/templates";
import {
  createResendClient,
  getResendFromEmail,
  isValidEmail
} from "@/lib/email/config";
import { getPhoneComparisonKey } from "@/lib/phone-number";
import {
  buildAudienceForDistributionStage,
  calculateSurveyDaysRemaining,
  getDueDistributionStage,
  hasSurveyExpired,
  normalizeSurveyDistributionStage,
  type SurveyDistributionStage
} from "@/lib/survey-rollout";
import { parseSurveyAudience, type SurveyRow } from "@/lib/survey-db";
import {
  buildSurveyLaunchTelegramMessage,
  sendTelegramMessage,
  shouldDisableTelegramSubscription,
  isTelegramBotConfigured
} from "@/lib/telegram";

type CommunityBaseRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  phone_number: string | null;
};

type CommunityProfileRow = {
  id: string;
  country: string | null;
  age_span: string | null;
  gender: string | null;
  educational_level: string | null;
  interests: string[] | null;
  salary_range: string | null;
  place_of_residence: string | null;
  family_status: string | null;
};

type SurveyResponseReferenceRow = {
  respondent_id: string;
  survey_id: number;
};

type SurveyNotificationRow = {
  recipient_id: string;
};

type TelegramSubscriptionRow = {
  user_id: string;
  phone_number_normalized: string;
  telegram_chat_id: string;
  notifications_enabled: boolean | null;
};

type SurveyDistributionCandidate = {
  id: string;
  email: string;
  firstName: string;
  completionCount: number;
  country: string;
  ageSpan: string;
  gender: string;
  memberProfile: CommunityAudienceProfile;
  telegramChatId: string | null;
};

type SurveyDistributionCandidateMatch = {
  candidate: SurveyDistributionCandidate;
  score: number;
  tierRank: number;
  matchesInterests: boolean;
};

type SurveyDistributionSummary = {
  surveyId: number;
  stage: SurveyDistributionStage;
  matchedRecipients: number;
  sentEmails: number;
  sentTelegramMessages: number;
  remainingResponses: number;
};

export type SurveyDistributionRunSummary = {
  processedSurveys: number;
  archivedSurveys: number;
  processedStageRuns: SurveyDistributionSummary[];
};

export type UpcomingSurveyDeliveryRecipient = {
  id: string;
  email: string;
  firstName: string;
  completionCount: number;
  country: string;
  ageSpan: string;
  gender: string;
};

export type UpcomingSurveyDeliveryPreview = {
  status: "ready" | "scheduled" | "completed";
  stage: SurveyDistributionStage | null;
  scheduledFor: string | null;
  recipients: UpcomingSurveyDeliveryRecipient[];
};

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function buildCompletionCounts(responseRows: SurveyResponseReferenceRow[]) {
  return responseRows.reduce<Map<string, number>>((accumulator, row) => {
    accumulator.set(row.respondent_id, (accumulator.get(row.respondent_id) ?? 0) + 1);
    return accumulator;
  }, new Map());
}

function buildSurveyResponseCountMap(responseRows: SurveyResponseReferenceRow[]) {
  return responseRows.reduce<Map<number, number>>((accumulator, row) => {
    accumulator.set(row.survey_id, (accumulator.get(row.survey_id) ?? 0) + 1);
    return accumulator;
  }, new Map());
}

function getTierRank(tier: ReturnType<typeof evaluateSurveyAudienceMatch>["tier"]) {
  switch (tier) {
    case "country_priority":
      return 0;
    case "demographic_fallback":
      return 1;
    default:
      return 2;
  }
}

function compareCandidateMatches(left: SurveyDistributionCandidateMatch, right: SurveyDistributionCandidateMatch) {
  if (left.tierRank !== right.tierRank) {
    return left.tierRank - right.tierRank;
  }

  if (left.score !== right.score) {
    return right.score - left.score;
  }

  if (left.candidate.completionCount !== right.candidate.completionCount) {
    return left.candidate.completionCount - right.candidate.completionCount;
  }

  if (left.matchesInterests !== right.matchesInterests) {
    return Number(right.matchesInterests) - Number(left.matchesInterests);
  }

  return 0;
}

function compareOpenAudienceCandidates(
  left: SurveyDistributionCandidate,
  right: SurveyDistributionCandidate
) {
  if (left.completionCount !== right.completionCount) {
    return left.completionCount - right.completionCount;
  }

  return left.firstName.localeCompare(right.firstName);
}

async function loadSurveyResponseReferences(admin: SupabaseClient) {
  const { data, error } = await admin.from("survey_responses").select("survey_id,respondent_id");

  if (error) {
    throw error;
  }

  return (data ?? []) as SurveyResponseReferenceRow[];
}

async function loadDistributionRecipientPool(
  admin: SupabaseClient,
  responseRows: SurveyResponseReferenceRow[]
) {
  const [
    { data: baseRows, error: baseError },
    { data: communityRows, error: communityError },
    { data: telegramRows, error: telegramError }
  ] = await Promise.all([
    admin.from("profiles").select("id,email,first_name,phone_number").eq("role", "community"),
    admin
      .from("community_profiles")
      .select(
        "id,country,age_span,gender,educational_level,interests,salary_range,place_of_residence,family_status"
      ),
    admin
      .from("telegram_notification_subscriptions")
      .select(
        "user_id,phone_number_normalized,telegram_chat_id,notifications_enabled"
      )
  ]);

  if (baseError) {
    throw baseError;
  }

  if (communityError) {
    throw communityError;
  }

  if (telegramError) {
    throw telegramError;
  }

  const completionCounts = buildCompletionCounts(responseRows);
  const communityById = new Map(
    ((communityRows as CommunityProfileRow[] | null) ?? []).map((row) => [row.id, row])
  );
  const telegramSubscriptionByUserId = new Map(
    ((telegramRows as TelegramSubscriptionRow[] | null) ?? [])
      .filter((row) => Boolean(row.notifications_enabled && row.telegram_chat_id))
      .map((row) => [row.user_id, row])
  );

  return ((baseRows as CommunityBaseRow[] | null) ?? [])
    .map((baseRow) => {
      const normalizedEmail = baseRow.email?.trim().toLowerCase() ?? "";
      const communityRow = communityById.get(baseRow.id);
      const currentPhoneKey = getPhoneComparisonKey(baseRow.phone_number);
      const telegramSubscription = telegramSubscriptionByUserId.get(baseRow.id);
      const hasVerifiedTelegramLink = Boolean(
        telegramSubscription &&
          currentPhoneKey &&
          telegramSubscription.phone_number_normalized === currentPhoneKey
      );

      if (!communityRow || !normalizedEmail || !isValidEmail(normalizedEmail)) {
        return null;
      }

      return {
        id: baseRow.id,
        email: normalizedEmail,
        firstName: baseRow.first_name?.trim() || "there",
        completionCount: completionCounts.get(baseRow.id) ?? 0,
        country: communityRow.country ?? "",
        ageSpan: communityRow.age_span ?? "",
        gender: communityRow.gender ?? "",
        telegramChatId: hasVerifiedTelegramLink
          ? telegramSubscription?.telegram_chat_id ?? null
          : null,
        memberProfile: buildCommunityAudienceProfile({
          ageSpan: communityRow.age_span,
          country: communityRow.country,
          gender: communityRow.gender,
          education: communityRow.educational_level,
          interests: communityRow.interests,
          salaryRange: communityRow.salary_range,
          residence: communityRow.place_of_residence,
          familyStatus: communityRow.family_status
        })
      };
    })
    .filter((candidate): candidate is SurveyDistributionCandidate => candidate !== null);
}

function isValidDate(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function getNextScheduledStage(params: {
  survey: SurveyRow;
  now: Date;
}) {
  const currentStage = normalizeSurveyDistributionStage(params.survey.distribution_stage);

  if (currentStage <= 0) {
    return {
      status: "ready" as const,
      stage: 1 as SurveyDistributionStage,
      scheduledFor: params.now.toISOString()
    };
  }

  const dueStage = getDueDistributionStage({
    distributionStage: currentStage,
    distributionStartedAt: params.survey.distribution_started_at,
    distributionLastSentAt: params.survey.distribution_last_sent_at,
    now: params.now
  });

  if (dueStage) {
    return {
      status: "ready" as const,
      stage: dueStage,
      scheduledFor: params.now.toISOString()
    };
  }

  if (currentStage >= 4) {
    return {
      status: "completed" as const,
      stage: null,
      scheduledFor: params.survey.distribution_completed_at ?? null
    };
  }

  const anchorDate = isValidDate(params.survey.distribution_last_sent_at)
    ? new Date(params.survey.distribution_last_sent_at as string)
    : isValidDate(params.survey.distribution_started_at)
      ? new Date(params.survey.distribution_started_at as string)
      : params.now;

  if (currentStage === 1) {
    return {
      status: "scheduled" as const,
      stage: 2 as SurveyDistributionStage,
      scheduledFor: addHours(anchorDate, 5).toISOString()
    };
  }

  return {
    status: "scheduled" as const,
    stage: (currentStage + 1) as SurveyDistributionStage,
    scheduledFor: addDays(anchorDate, 1).toISOString()
  };
}

export async function previewUpcomingSurveyDelivery(params: {
  admin: SupabaseClient;
  survey: SurveyRow;
  now?: Date;
  recipientPool?: SurveyDistributionCandidate[];
  surveyResponseRows?: SurveyResponseReferenceRow[];
  responseCount?: number;
}) {
  const now = params.now ?? new Date();
  const surveyResponseRows =
    params.surveyResponseRows ?? (await loadSurveyResponseReferences(params.admin));
  const recipientPool =
    params.recipientPool ?? (await loadDistributionRecipientPool(params.admin, surveyResponseRows));
  const responseCount =
    params.responseCount ??
    buildSurveyResponseCountMap(surveyResponseRows).get(params.survey.id) ??
    0;

  if (
    params.survey.status !== "published" ||
    hasSurveyExpired(params.survey.distribution_expires_at, now) ||
    responseCount >= params.survey.target_responses
  ) {
    return {
      status: "completed" as const,
      stage: null,
      scheduledFor: null,
      recipients: []
    } satisfies UpcomingSurveyDeliveryPreview;
  }

  const nextStage = getNextScheduledStage({
    survey: params.survey,
    now
  });

  if (!nextStage.stage) {
    return {
      status: nextStage.status,
      stage: null,
      scheduledFor: nextStage.scheduledFor,
      recipients: []
    } satisfies UpcomingSurveyDeliveryPreview;
  }

  const alreadyNotifiedIds = await listSurveyNotifiedRecipientIds(params.admin, params.survey.id);
  const { matchedRecipients } = selectRecipientsForStage({
    survey: params.survey,
    stage: nextStage.stage,
    responseCount,
    surveyResponseRows,
    recipientPool,
    alreadyNotifiedIds
  });

  return {
    status: nextStage.status,
    stage: nextStage.stage,
    scheduledFor: nextStage.scheduledFor,
    recipients: matchedRecipients.map((recipient) => ({
      id: recipient.id,
      email: recipient.email,
      firstName: recipient.firstName,
      completionCount: recipient.completionCount,
      country: recipient.country,
      ageSpan: recipient.ageSpan,
      gender: recipient.gender
    }))
  } satisfies UpcomingSurveyDeliveryPreview;
}

async function listPublishedSurveyRows(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("surveys")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as SurveyRow[];
}

async function listSurveyNotifiedRecipientIds(admin: SupabaseClient, surveyId: number) {
  const { data, error } = await admin
    .from("survey_notifications")
    .select("recipient_id")
    .eq("survey_id", surveyId);

  if (error) {
    throw error;
  }

  return new Set(((data ?? []) as SurveyNotificationRow[]).map((row) => row.recipient_id));
}

function selectRecipientsForStage(params: {
  survey: SurveyRow;
  stage: SurveyDistributionStage;
  responseCount: number;
  surveyResponseRows: SurveyResponseReferenceRow[];
  recipientPool: SurveyDistributionCandidate[];
  alreadyNotifiedIds: Set<string>;
}) {
  const audience = buildAudienceForDistributionStage(
    parseSurveyAudience(params.survey.audience),
    params.stage
  );
  const remainingResponses = Math.max(0, params.survey.target_responses - params.responseCount);

  if (remainingResponses <= 0) {
    return {
      matchedRecipients: [] as SurveyDistributionCandidate[],
      remainingResponses
    };
  }

  const alreadySubmittedIds = new Set(
    params.surveyResponseRows
      .filter((row) => row.survey_id === params.survey.id)
      .map((row) => row.respondent_id)
  );

  const eligibleCandidates = params.recipientPool.filter((candidate) => {
    if (params.alreadyNotifiedIds.has(candidate.id) || alreadySubmittedIds.has(candidate.id)) {
      return false;
    }

    if (params.stage === 1) {
      return candidate.completionCount === 0;
    }

    return true;
  });

  if (!audience) {
    return {
      matchedRecipients: eligibleCandidates
        .slice()
        .sort(compareOpenAudienceCandidates)
        .slice(0, remainingResponses),
      remainingResponses
    };
  }

  const matchedRecipients = eligibleCandidates
    .map((candidate) => {
      const match = evaluateSurveyAudienceMatch(audience, candidate.memberProfile, {
        allowCountryFallback: false
      });

      if (!match.isQualified) {
        return null;
      }

      return {
        candidate,
        score: match.score,
        tierRank: getTierRank(match.tier),
        matchesInterests: match.matchesInterests
      };
    })
    .filter(
      (entry): entry is SurveyDistributionCandidateMatch =>
        entry !== null
    )
    .sort(compareCandidateMatches)
    .slice(0, remainingResponses)
    .map((entry) => entry.candidate);

  return {
    matchedRecipients,
    remainingResponses
  };
}

async function sendSurveyEmails(params: {
  survey: SurveyRow;
  stage: SurveyDistributionStage;
  recipients: SurveyDistributionCandidate[];
  appBaseUrl: string;
}) {
  if (params.recipients.length === 0) {
    return 0;
  }

  const resend = createResendClient();
  const fromEmail = getResendFromEmail("MERGEN AI <onboarding@resend.dev>");
  const dashboardUrl = `${params.appBaseUrl}/dashboard/community`;
  let sentEmails = 0;

  for (const recipientChunk of chunkArray(params.recipients, 50)) {
    const batchResponse = await resend.batch.send(
      recipientChunk.map((recipient) => {
        const emailContent = buildSurveyLaunchEmail({
          firstName: recipient.firstName,
          title: params.survey.name,
          description: params.survey.description,
          questionCount: params.survey.question_count ?? 0,
          targetResponses: params.survey.target_responses,
          dashboardUrl
        });

        return {
          from: fromEmail,
          to: recipient.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          tags: [
            { name: "flow", value: "survey-launch" },
            { name: "survey_stage", value: String(params.stage) }
          ]
        };
      })
    );

    if (batchResponse.error) {
      throw new Error(batchResponse.error.message);
    }

    sentEmails += recipientChunk.length;
  }

  return sentEmails;
}

async function sendSurveyTelegramMessages(params: {
  admin: SupabaseClient;
  survey: SurveyRow;
  recipients: SurveyDistributionCandidate[];
  appBaseUrl: string;
}) {
  if (!isTelegramBotConfigured()) {
    return 0;
  }

  const recipientsWithTelegram = params.recipients.filter(
    (recipient) => recipient.telegramChatId
  );

  if (recipientsWithTelegram.length === 0) {
    return 0;
  }

  const dashboardUrl = `${params.appBaseUrl}/dashboard/community`;
  const deliveredRecipientIds: string[] = [];
  const disabledRecipientIds: string[] = [];

  for (const recipientChunk of chunkArray(recipientsWithTelegram, 20)) {
    const results = await Promise.allSettled(
      recipientChunk.map(async (recipient) => {
        await sendTelegramMessage({
          chatId: recipient.telegramChatId ?? "",
          text: buildSurveyLaunchTelegramMessage({
            firstName: recipient.firstName,
            title: params.survey.name,
            description: params.survey.description,
            questionCount: params.survey.question_count ?? 0,
            targetResponses: params.survey.target_responses,
            dashboardUrl
          })
        });

        return recipient.id;
      })
    );

    results.forEach((result, index) => {
      const recipientId = recipientChunk[index]?.id;

      if (!recipientId) {
        return;
      }

      if (result.status === "fulfilled") {
        deliveredRecipientIds.push(result.value);
        return;
      }

      console.error("Telegram survey notification failed.", result.reason);

      if (shouldDisableTelegramSubscription(result.reason)) {
        disabledRecipientIds.push(recipientId);
      }
    });
  }

  if (deliveredRecipientIds.length > 0) {
    const notifiedAt = new Date().toISOString();
    const { error } = await params.admin
      .from("telegram_notification_subscriptions")
      .update({
        last_notified_at: notifiedAt,
        updated_at: notifiedAt
      })
      .in("user_id", deliveredRecipientIds);

    if (error) {
      console.error("Failed to update Telegram notification timestamps.", error);
    }
  }

  if (disabledRecipientIds.length > 0) {
    const disabledAt = new Date().toISOString();
    const { error } = await params.admin
      .from("telegram_notification_subscriptions")
      .update({
        notifications_enabled: false,
        updated_at: disabledAt
      })
      .in("user_id", disabledRecipientIds);

    if (error) {
      console.error("Failed to disable unreachable Telegram subscriptions.", error);
    }
  }

  return deliveredRecipientIds.length;
}

async function persistNotificationRows(params: {
  admin: SupabaseClient;
  surveyId: number;
  stage: SurveyDistributionStage;
  recipients: SurveyDistributionCandidate[];
}) {
  if (params.recipients.length === 0) {
    return;
  }

  const { error } = await params.admin.from("survey_notifications").insert(
    params.recipients.map((recipient) => ({
      survey_id: params.surveyId,
      recipient_id: recipient.id,
      recipient_email: recipient.email,
      stage: params.stage
    }))
  );

  if (error) {
    throw error;
  }
}

async function markSurveyStageProcessed(params: {
  admin: SupabaseClient;
  survey: SurveyRow;
  stage: SurveyDistributionStage;
  processedAt: Date;
}) {
  const processedAtIso = params.processedAt.toISOString();
  const nextDaysRemaining = calculateSurveyDaysRemaining(
    params.survey.distribution_expires_at,
    params.survey.days_remaining,
    params.processedAt
  );

  const { error } = await params.admin
    .from("surveys")
    .update({
      distribution_stage: params.stage,
      distribution_last_sent_at: processedAtIso,
      distribution_completed_at:
        params.stage === 4
          ? processedAtIso
          : params.survey.distribution_completed_at ?? null,
      days_remaining: nextDaysRemaining
    })
    .eq("id", params.survey.id);

  if (error) {
    throw error;
  }
}

export async function archiveSurvey(admin: SupabaseClient, surveyId: number, archivedAt = new Date()) {
  const archivedAtIso = archivedAt.toISOString();
  const { error } = await admin
    .from("surveys")
    .update({
      status: "archived",
      days_remaining: 0,
      distribution_completed_at: archivedAtIso
    })
    .eq("id", surveyId)
    .eq("status", "published");

  if (error) {
    throw error;
  }
}

export async function dispatchSurveyStage(params: {
  admin: SupabaseClient;
  survey: SurveyRow;
  stage: SurveyDistributionStage;
  appBaseUrl: string;
  recipientPool: SurveyDistributionCandidate[];
  surveyResponseRows: SurveyResponseReferenceRow[];
  responseCount: number;
  processedAt?: Date;
}) {
  const processedAt = params.processedAt ?? new Date();
  const alreadyNotifiedIds = await listSurveyNotifiedRecipientIds(params.admin, params.survey.id);
  const { matchedRecipients, remainingResponses } = selectRecipientsForStage({
    survey: params.survey,
    stage: params.stage,
    responseCount: params.responseCount,
    surveyResponseRows: params.surveyResponseRows,
    recipientPool: params.recipientPool,
    alreadyNotifiedIds
  });

  const sentEmails = await sendSurveyEmails({
    survey: params.survey,
    stage: params.stage,
    recipients: matchedRecipients,
    appBaseUrl: params.appBaseUrl
  });
  const sentTelegramMessages = await sendSurveyTelegramMessages({
    admin: params.admin,
    survey: params.survey,
    recipients: matchedRecipients,
    appBaseUrl: params.appBaseUrl
  });

  await persistNotificationRows({
    admin: params.admin,
    surveyId: params.survey.id,
    stage: params.stage,
    recipients: matchedRecipients
  });

  await markSurveyStageProcessed({
    admin: params.admin,
    survey: params.survey,
    stage: params.stage,
    processedAt
  });

  return {
    surveyId: params.survey.id,
    stage: params.stage,
    matchedRecipients: matchedRecipients.length,
    sentEmails,
    sentTelegramMessages,
    remainingResponses
  };
}

export async function dispatchSurveyLaunchStage(params: {
  admin: SupabaseClient;
  survey: SurveyRow;
  appBaseUrl: string;
  processedAt?: Date;
}) {
  const surveyResponseRows = await loadSurveyResponseReferences(params.admin);
  const recipientPool = await loadDistributionRecipientPool(params.admin, surveyResponseRows);
  const responseCounts = buildSurveyResponseCountMap(surveyResponseRows);

  return dispatchSurveyStage({
    admin: params.admin,
    survey: params.survey,
    stage: 1,
    appBaseUrl: params.appBaseUrl,
    recipientPool,
    surveyResponseRows,
    responseCount: responseCounts.get(params.survey.id) ?? 0,
    processedAt: params.processedAt
  });
}

export async function runSurveyDistributionCycle(params: {
  admin: SupabaseClient;
  appBaseUrl: string;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const [surveyRows, surveyResponseRows] = await Promise.all([
    listPublishedSurveyRows(params.admin),
    loadSurveyResponseReferences(params.admin)
  ]);
  const recipientPool = await loadDistributionRecipientPool(params.admin, surveyResponseRows);
  const surveyResponseCounts = buildSurveyResponseCountMap(surveyResponseRows);
  const processedStageRuns: SurveyDistributionSummary[] = [];
  let archivedSurveys = 0;

  for (const survey of surveyRows) {
    const responseCount = surveyResponseCounts.get(survey.id) ?? 0;
    const isFilled = responseCount >= survey.target_responses;
    const isExpired = hasSurveyExpired(survey.distribution_expires_at, now);

    if (isFilled || isExpired) {
      await archiveSurvey(params.admin, survey.id, now);
      archivedSurveys += 1;
      continue;
    }

    const dueStage = getDueDistributionStage({
      distributionStage: normalizeSurveyDistributionStage(survey.distribution_stage),
      distributionStartedAt: survey.distribution_started_at,
      distributionLastSentAt: survey.distribution_last_sent_at,
      now
    });

    if (!dueStage) {
      continue;
    }

    processedStageRuns.push(
      await dispatchSurveyStage({
        admin: params.admin,
        survey,
        stage: dueStage,
        appBaseUrl: params.appBaseUrl,
        recipientPool,
        surveyResponseRows,
        responseCount,
        processedAt: now
      })
    );
  }

  return {
    processedSurveys: surveyRows.length,
    archivedSurveys,
    processedStageRuns
  } satisfies SurveyDistributionRunSummary;
}
