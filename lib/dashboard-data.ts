export const CLIENT_DASHBOARD_SURVEYS_STORAGE_KEY = "mergen-client-dashboard-surveys";
export const CLIENT_DASHBOARD_SETTINGS_STORAGE_KEY = "mergen-client-dashboard-settings";
export const COMMUNITY_DASHBOARD_SETTINGS_STORAGE_KEY = "mergen-community-dashboard-settings";
export const COMMUNITY_DASHBOARD_PROGRESS_STORAGE_KEY = "mergen-community-dashboard-progress";
export const CREATE_SURVEY_DRAFT_STORAGE_KEY = "mergen-client-create-survey-draft";
export const CLIENT_PENDING_POLAR_CHECKOUT_STORAGE_KEY = "mergen-client-pending-polar-checkout";
export const SURVEY_PREVIEW_STORAGE_KEY = "mergen-survey-preview";

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
  source: "gemini" | "fallback";
};

export type SurveyAudience = {
  countries: string[];
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

export type ClientSurvey = {
  id: number;
  name: string;
  status: string;
  responses: number;
  targetResponses: number;
  daysRemaining: number;
  createdDate: string;
  description: string;
  questionCount?: number;
  audience?: SurveyAudience;
  questions?: StoredSurveyQuestion[];
};

export type SurveyCheckoutPayload = {
  title: string;
  targetResponses: number;
  questionCount: number;
  description: string;
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
