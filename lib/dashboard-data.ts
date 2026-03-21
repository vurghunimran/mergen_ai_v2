export const CLIENT_DASHBOARD_SURVEYS_STORAGE_KEY = "mergen-client-dashboard-surveys";
export const CLIENT_DASHBOARD_SETTINGS_STORAGE_KEY = "mergen-client-dashboard-settings";
export const COMMUNITY_DASHBOARD_SETTINGS_STORAGE_KEY = "mergen-community-dashboard-settings";
export const COMMUNITY_DASHBOARD_PROGRESS_STORAGE_KEY = "mergen-community-dashboard-progress";

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

export type SurveyAudience = {
  countries: string[];
  ageMin: number;
  ageMax: number;
  gender: string;
  education: string;
  interests: string[];
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
