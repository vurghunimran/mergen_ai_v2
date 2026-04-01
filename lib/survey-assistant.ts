import type { StoredSurveyQuestion, SurveyQuestionType } from "@/lib/dashboard-data";

export const surveyQuestionTypes: SurveyQuestionType[] = [
  "Multiple choice",
  "Single select",
  "Likert scale",
  "Open question",
  "Yes / No",
  "Rating scale",
  "Ranking"
];

export type SurveyAssistantRequest = {
  surveyTitle: string;
  researchArea: string;
  targetRegion: string;
  generalAudience: boolean;
  selectedCountries: string[];
  ageMin: number;
  ageMax: number;
  financialSituation: string;
  gender: string;
  education: string;
  residence: string;
  familyStatus: string;
  interests: string[];
  questionCount: number;
  respondentCount: number;
  assistantPrompt: string;
  researchScope: string;
  hypothesis: string;
};

export type SurveyAssistantResponse = {
  assistantPrompt: string;
  researchScope: string;
  hypothesis: string;
  questions: StoredSurveyQuestion[];
};

export function questionOptionsForType(type: SurveyQuestionType) {
  switch (type) {
    case "Likert scale":
      return ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];
    case "Open question":
      return ["Free-text response"];
    case "Single select":
      return ["Option A", "Option B", "Option C", "Option D"];
    case "Yes / No":
      return ["Yes", "No"];
    case "Rating scale":
      return ["1", "2", "3", "4", "5"];
    case "Ranking":
      return ["Option A", "Option B", "Option C", "Option D"];
    default:
      return ["Option A", "Option B", "Option C", "Option D"];
  }
}

export function normalizeQuestionOptions(type: SurveyQuestionType, options: string[]) {
  if (type === "Open question" || type === "Likert scale" || type === "Yes / No" || type === "Rating scale") {
    return questionOptionsForType(type);
  }

  const cleanedOptions = Array.from(new Set(options.map((option) => option.trim()).filter(Boolean)));
  return cleanedOptions.length >= 2 ? cleanedOptions.slice(0, 8) : questionOptionsForType(type);
}
