const CLIENT_DASHBOARD_SETTINGS_STORAGE_KEY = "mergen-client-dashboard-settings";
const COMMUNITY_DASHBOARD_SETTINGS_STORAGE_KEY = "mergen-community-dashboard-settings";
const COMMUNITY_DASHBOARD_PROGRESS_STORAGE_KEY = "mergen-community-dashboard-progress";
const COMMUNITY_DASHBOARD_ANNOUNCEMENT_STORAGE_KEY = "mergen-community-dashboard-announcement";
const CREATE_SURVEY_DRAFT_STORAGE_KEY = "mergen-client-create-survey-draft";
const CLIENT_PENDING_POLAR_CHECKOUT_STORAGE_KEY = "mergen-client-pending-polar-checkout";
export const SURVEY_PREVIEW_STORAGE_KEY = "mergen-survey-preview";

function buildUserScopedStorageKey(baseKey: string, userId: string) {
  return `${baseKey}:${userId}`;
}

export function getClientDashboardSettingsStorageKey(userId: string) {
  return buildUserScopedStorageKey(CLIENT_DASHBOARD_SETTINGS_STORAGE_KEY, userId);
}

export function getCommunityDashboardSettingsStorageKey(userId: string) {
  return buildUserScopedStorageKey(COMMUNITY_DASHBOARD_SETTINGS_STORAGE_KEY, userId);
}

export function getCommunityDashboardProgressStorageKey(userId: string) {
  return buildUserScopedStorageKey(COMMUNITY_DASHBOARD_PROGRESS_STORAGE_KEY, userId);
}

export function getCommunityDashboardAnnouncementStorageKey(userId: string) {
  return buildUserScopedStorageKey(COMMUNITY_DASHBOARD_ANNOUNCEMENT_STORAGE_KEY, userId);
}

export function getCreateSurveyDraftStorageKey(userId: string) {
  return buildUserScopedStorageKey(CREATE_SURVEY_DRAFT_STORAGE_KEY, userId);
}

export function getClientPendingPolarCheckoutStorageKey(userId: string) {
  return buildUserScopedStorageKey(CLIENT_PENDING_POLAR_CHECKOUT_STORAGE_KEY, userId);
}

export type SurveyQuestionType =
  | "Multiple choice"
  | "Single select"
  | "Likert scale"
  | "Open question"
  | "Yes / No"
  | "Rating scale"
  | "Ranking";

export type StoredSurveyQuestion = {
  id: string;
  text: string;
  type: SurveyQuestionType;
  options: string[];
};

export type SurveyAnswerValue = string | string[];
export type SurveyAnswerMap = Record<string, SurveyAnswerValue>;

export type SurveySubmissionAnswer = {
  questionId: string;
  questionText: string;
  questionType: SurveyQuestionType;
  answer: SurveyAnswerValue;
};

export type SurveyTrustEvaluationRequest = {
  surveyTitle: string;
  surveyDescription: string;
  questions: StoredSurveyQuestion[];
  answers: SurveySubmissionAnswer[];
  completionTimeSeconds: number;
};

export type SurveyTrustEvaluationResponse = {
  trustScore: number;
  credits: number;
  summary: string;
  strengths: string[];
  risks: string[];
  completionTimeSeconds: number;
  source: "gemini" | "fallback" | "fixed";
};

export type SurveyKind = "standard" | "welcome";

export type SurveyAudience = {
  countries: string[];
  generalAudience?: boolean;
  ageMin: number;
  ageMax: number;
  gender: string;
  education: string;
  interests: string[];
  salaryRange?: string;
  residence?: string;
  familyStatus?: string;
  researchArea: string;
};

export type SurveyResponseRecord = {
  id: string;
  respondentId: string;
  submittedAt: string;
  completionTimeSeconds: number;
  trustScore: number;
  earnedCredits: number;
  summary: string;
  answers: SurveySubmissionAnswer[];
};

export type CommunityCompletion = {
  surveyId: number;
  surveyName: string;
  earnedCredits: number;
  score: number | null;
  completedAt: string;
  summary: string;
  durationSeconds: number;
  source: SurveyTrustEvaluationResponse["source"];
  kind?: SurveyKind;
};

export type CommunityProgress = {
  completions: CommunityCompletion[];
};

export type ClientSurvey = {
  id: number;
  userId: string;
  name: string;
  status: string;
  responses: number;
  targetResponses: number;
  daysRemaining: number;
  createdDate: string;
  description: string;
  questionCount?: number;
  audience?: SurveyAudience;
  distributionStage?: number;
  distributionWindowDays?: number;
  distributionExpiresAt?: string;
  questions?: StoredSurveyQuestion[];
  researchDescription?: string;
  researchScope?: string;
  hypothesis?: string;
  includeDetailedAI?: boolean;
  rawResponses?: SurveyResponseRecord[];
  kind?: SurveyKind;
  fixedCredits?: number;
};

export type SurveyCheckoutPayload = {
  title: string;
  targetResponses: number;
  questionCount: number;
  description: string;
  researchDescription: string;
  researchScope: string;
  hypothesis: string;
  audience: SurveyAudience;
  questions: StoredSurveyQuestion[];
  includeDetailedAI: boolean;
};

export type PendingPolarCheckout = {
  payload: SurveyCheckoutPayload;
  createdAt: string;
};

export type SurveyPreviewPayload = {
  title: string;
  subtitle: string;
  questions: StoredSurveyQuestion[];
  createdAt: string;
};

export type SurveyReportRequest = {
  surveyId: number;
};

export type SurveyReportResponse = {
  executiveSummary: string;
  keyInsights: string[];
  futurePredictions: string[];
  recommendations: string[];
  methodologyNote: string;
  dataQualityNote: string;
};
