export const academicQuestionCountOptions = [5, 10, 15, 20, 25] as const;
export const academicRespondentCountOptions = [50, 100, 250, 500, 1000] as const;

export type AcademicQuestionCount = (typeof academicQuestionCountOptions)[number];
export type AcademicRespondentCount = (typeof academicRespondentCountOptions)[number];

const academicSurveyPricing = {
  5: {
    50: 50,
    100: 90,
    250: 200,
    500: 350,
    1000: 650
  },
  10: {
    50: 70,
    100: 120,
    250: 280,
    500: 500,
    1000: 900
  },
  15: {
    50: 90,
    100: 160,
    250: 350,
    500: 650,
    1000: 1200
  },
  20: {
    50: 110,
    100: 200,
    250: 450,
    500: 800,
    1000: 1500
  },
  25: {
    50: 130,
    100: 240,
    250: 550,
    500: 1000,
    1000: 1900
  }
} satisfies Record<AcademicQuestionCount, Record<AcademicRespondentCount, number>>;

export const AI_DETAILED_SURVEY_FEE = 20;

export function getAcademicQuestionPricingTier(questionCount: number): AcademicQuestionCount {
  return academicQuestionCountOptions.find((option) => questionCount <= option) ?? 25;
}

export function getAcademicSurveyBasePrice(questionCount: number, respondentCount: AcademicRespondentCount) {
  const questionTier = getAcademicQuestionPricingTier(questionCount);

  return {
    questionTier,
    basePrice: academicSurveyPricing[questionTier][respondentCount]
  };
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}
