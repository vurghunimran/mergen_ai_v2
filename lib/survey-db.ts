import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ClientSurvey,
  CommunityCompletion,
  StoredSurveyQuestion,
  SurveyAudience,
  SurveyCheckoutPayload,
  SurveyResponseRecord,
  SurveyQuestionType,
  SurveySubmissionAnswer
} from "@/lib/dashboard-data";
import {
  buildSurveyRolloutWindow,
  calculateSurveyDaysRemaining,
  hasSurveyExpired,
  normalizeSurveyDistributionStage
} from "@/lib/survey-rollout";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type SurveyRow = {
  id: number;
  user_id: string;
  name: string;
  status: string;
  target_responses: number;
  days_remaining: number;
  description: string;
  question_count: number | null;
  audience: Json | null;
  questions: Json | null;
  research_description: string | null;
  research_scope: string | null;
  hypothesis: string | null;
  include_detailed_ai: boolean;
  distribution_stage?: number | null;
  distribution_started_at?: string | null;
  distribution_last_sent_at?: string | null;
  distribution_completed_at?: string | null;
  distribution_window_days?: number | null;
  distribution_expires_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type SurveyResponseRow = {
  id: string;
  survey_id: number;
  respondent_id: string;
  submitted_at: string;
  completion_time_seconds: number;
  trust_score: number;
  earned_credits: number;
  summary: string;
  answers: Json | null;
};

type CommunityCompletionRow = {
  survey_id: number;
  submitted_at: string;
  completion_time_seconds: number;
  trust_score: number;
  earned_credits: number;
  summary: string;
  surveys:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
};

const VALID_QUESTION_TYPES = new Set([
  "Multiple choice",
  "Single select",
  "Likert scale",
  "Open question",
  "Yes / No",
  "Rating scale",
  "Ranking"
]);

function isSurveyQuestionType(value: string): value is SurveyQuestionType {
  return VALID_QUESTION_TYPES.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseStoredSurveyQuestions(value: unknown): StoredSurveyQuestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((question) => {
    if (!isRecord(question)) {
      return [];
    }

    const typeValue = getString(question.type);

    if (!isSurveyQuestionType(typeValue)) {
      return [];
    }

    const parsedQuestion: StoredSurveyQuestion = {
      id: getString(question.id),
      text: getString(question.text),
      type: typeValue,
      options: getStringArray(question.options)
    };

    if (!parsedQuestion.id || !parsedQuestion.text) {
      return [];
    }

    return [parsedQuestion];
  });
}

export function parseSurveyAudience(value: unknown): SurveyAudience | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    countries: getStringArray(value.countries),
    ageMin: getNumber(value.ageMin),
    ageMax: getNumber(value.ageMax),
    gender: getString(value.gender),
    education: getString(value.education),
    interests: getStringArray(value.interests),
    salaryRange: getString(value.salaryRange) || undefined,
    residence: getString(value.residence) || undefined,
    familyStatus: getString(value.familyStatus) || undefined,
    researchArea: getString(value.researchArea)
  };
}

function parseSurveySubmissionAnswers(value: unknown): SurveySubmissionAnswer[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((answer) => {
    if (!isRecord(answer)) {
      return [];
    }

    const questionType = getString(answer.questionType);

    if (!isSurveyQuestionType(questionType)) {
      return [];
    }

    const rawAnswer = answer.answer;
    const normalizedAnswer =
      typeof rawAnswer === "string"
        ? rawAnswer
        : Array.isArray(rawAnswer)
          ? rawAnswer.filter((item): item is string => typeof item === "string")
          : "";

    return [
      {
        questionId: getString(answer.questionId),
        questionText: getString(answer.questionText),
        questionType,
        answer: normalizedAnswer
      }
    ].filter((entry) => entry.questionId && entry.questionText);
  });
}

function mapSurveyResponseRow(row: SurveyResponseRow): SurveyResponseRecord {
  return {
    id: row.id,
    respondentId: row.respondent_id,
    submittedAt: row.submitted_at,
    completionTimeSeconds: row.completion_time_seconds,
    trustScore: row.trust_score,
    earnedCredits: row.earned_credits,
    summary: row.summary,
    answers: parseSurveySubmissionAnswers(row.answers)
  };
}

function getSurveyNameFromCompletionRow(row: CommunityCompletionRow) {
  if (Array.isArray(row.surveys)) {
    return row.surveys[0]?.name ?? "";
  }

  return row.surveys?.name ?? "";
}

function mapCommunityCompletionRow(row: CommunityCompletionRow): CommunityCompletion {
  return {
    surveyId: row.survey_id,
    surveyName: getSurveyNameFromCompletionRow(row) || `Survey #${row.survey_id}`,
    earnedCredits: row.earned_credits,
    score: row.trust_score,
    completedAt: row.submitted_at,
    summary: row.summary,
    durationSeconds: row.completion_time_seconds,
    source: "fallback"
  };
}

function formatCreatedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function mapSurveyRowToClientSurvey(row: SurveyRow, responseRows: SurveyResponseRow[] = []): ClientSurvey {
  const rawResponses = responseRows.map(mapSurveyResponseRow);
  const parsedQuestions = parseStoredSurveyQuestions(row.questions);
  const daysRemaining = calculateSurveyDaysRemaining(
    row.distribution_expires_at,
    row.days_remaining,
    new Date()
  );
  const responseCount = rawResponses.length;
  const isSurveyClosed =
    row.status === "published" &&
    (hasSurveyExpired(row.distribution_expires_at, new Date()) || responseCount >= row.target_responses);

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    status: isSurveyClosed ? "archived" : row.status,
    responses: responseCount,
    targetResponses: row.target_responses,
    daysRemaining,
    createdDate: formatCreatedDate(row.created_at),
    description: row.description,
    questionCount: row.question_count ?? parsedQuestions.length,
    audience: parseSurveyAudience(row.audience),
    distributionStage: normalizeSurveyDistributionStage(row.distribution_stage),
    distributionWindowDays: row.distribution_window_days ?? undefined,
    distributionExpiresAt: row.distribution_expires_at ?? undefined,
    questions: parsedQuestions,
    researchDescription: row.research_description ?? row.description,
    researchScope: row.research_scope ?? "",
    hypothesis: row.hypothesis ?? "",
    includeDetailedAI: row.include_detailed_ai,
    rawResponses
  };
}

export function buildSurveyInsertPayload(payload: SurveyCheckoutPayload, userId: string) {
  const rolloutWindow = buildSurveyRolloutWindow(payload.targetResponses);

  return {
    user_id: userId,
    name: payload.title.trim(),
    status: "published",
    target_responses: payload.targetResponses,
    days_remaining: rolloutWindow.activeDays,
    description: payload.description.trim(),
    question_count: payload.questionCount,
    audience: payload.audience,
    questions: payload.questions,
    research_description: payload.researchDescription.trim(),
    research_scope: payload.researchScope.trim(),
    hypothesis: payload.hypothesis.trim(),
    include_detailed_ai: Boolean(payload.includeDetailedAI),
    distribution_stage: 0,
    distribution_started_at: rolloutWindow.startedAt,
    distribution_last_sent_at: null,
    distribution_completed_at: null,
    distribution_window_days: rolloutWindow.activeDays,
    distribution_expires_at: rolloutWindow.expiresAt
  };
}

async function listSurveyResponses(supabase: SupabaseClient, surveyIds: number[]) {
  if (surveyIds.length === 0) {
    return [] as SurveyResponseRow[];
  }

  const { data, error } = await supabase
    .from("survey_responses")
    .select("*")
    .in("survey_id", surveyIds)
    .order("submitted_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as SurveyResponseRow[];
}

function groupResponsesBySurveyId(responseRows: SurveyResponseRow[]) {
  return responseRows.reduce<Record<number, SurveyResponseRow[]>>((accumulator, row) => {
    if (!accumulator[row.survey_id]) {
      accumulator[row.survey_id] = [];
    }

    accumulator[row.survey_id].push(row);
    return accumulator;
  }, {});
}

export async function listClientSurveysForUser(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("surveys")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const surveyRows = (data ?? []) as SurveyRow[];
  const responseRows = await listSurveyResponses(
    supabase,
    surveyRows.map((survey) => survey.id)
  );
  const responsesBySurveyId = groupResponsesBySurveyId(responseRows);

  return surveyRows.map((survey) => mapSurveyRowToClientSurvey(survey, responsesBySurveyId[survey.id] ?? []));
}

export async function getClientSurveyForUser(supabase: SupabaseClient, surveyId: number, userId: string) {
  const { data, error } = await supabase
    .from("surveys")
    .select("*")
    .eq("id", surveyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const responseRows = await listSurveyResponses(supabase, [surveyId]);
  return mapSurveyRowToClientSurvey(data as SurveyRow, responseRows);
}

export async function listPublishedSurveys(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("surveys")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as SurveyRow[])
    .map((survey) => mapSurveyRowToClientSurvey(survey))
    .filter((survey) => survey.status === "published" && survey.daysRemaining > 0);
}

export async function listPublishedSurveysForRespondent(supabase: SupabaseClient, respondentId: string) {
  const [surveyRows, responseRows] = await Promise.all([
    listPublishedSurveys(supabase),
    supabase.from("survey_responses").select("survey_id").eq("respondent_id", respondentId)
  ]);

  const { data, error } = responseRows;

  if (error) {
    throw error;
  }

  const submittedSurveyIds = new Set((data ?? []).map((row) => row.survey_id as number));

  return surveyRows.filter((survey) => !submittedSurveyIds.has(survey.id));
}

export async function listCommunityCompletions(supabase: SupabaseClient, respondentId: string) {
  const { data, error } = await supabase
    .from("survey_responses")
    .select("survey_id,submitted_at,completion_time_seconds,trust_score,earned_credits,summary,surveys(name)")
    .eq("respondent_id", respondentId)
    .order("submitted_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as CommunityCompletionRow[]).map(mapCommunityCompletionRow);
}
