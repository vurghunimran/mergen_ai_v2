export const academicQuestionCountOptions = [5, 10, 15, 20, 25] as const;
export const academicRespondentCountOptions = [50, 100, 250, 500, 1000] as const;
export type AcademicQuestionCount = (typeof academicQuestionCountOptions)[number];
export type AcademicRespondentCount = (typeof academicRespondentCountOptions)[number];
export type PricingCategory = "student" | "institution";
export const SURVEY_PRICING_VERSION = "survey-formula-v1";
export const AI_DETAILED_SURVEY_FEE = 20;
export type SurveyPricingInput = {
  pricingCategory: PricingCategory;
  questionCount: AcademicQuestionCount;
  responseCount: AcademicRespondentCount;
  includeDetailedReport: boolean;
};
export class SurveyPricingError extends Error {}
export function calculateSurveyPricing(input: unknown) {
  if (!input || typeof input !== "object") throw new SurveyPricingError("Invalid pricing input.");
  const value = input as Record<string, unknown>;
  if (value.pricingCategory !== "student" && value.pricingCategory !== "institution")
    throw new SurveyPricingError("Choose Students or Institutions & Businesses.");
  if (!academicQuestionCountOptions.includes(value.questionCount as AcademicQuestionCount))
    throw new SurveyPricingError("Question allowance must be 5, 10, 15, 20, or 25.");
  if (!academicRespondentCountOptions.includes(value.responseCount as AcademicRespondentCount))
    throw new SurveyPricingError("Requested responses must be 50, 100, 250, 500, or 1000.");
  if (typeof value.includeDetailedReport !== "boolean")
    throw new SurveyPricingError("Detailed report selection must be a boolean.");
  const { pricingCategory, questionCount, responseCount, includeDetailedReport } = value as SurveyPricingInput;
  const setupFeeCents = pricingCategory === "student" ? 1000 : 2500;
  const perResponseCents = pricingCategory === "student" ? 30 + 3 * questionCount : 50 + 5 * questionCount;
  const responseSubtotalCents = responseCount * perResponseCents;
  const baseTotalCents = setupFeeCents + responseSubtotalCents;
  const reportFeeCents = includeDetailedReport ? 2000 : 0;
  return { currency: "USD" as const, pricingCategory, questionCount, responseCount, setupFeeCents,
    perResponseCents, responseSubtotalCents, baseTotalCents, reportFeeCents,
    totalCents: baseTotalCents + reportFeeCents, pricingVersion: SURVEY_PRICING_VERSION };
}
export type SurveyPricingBreakdown = ReturnType<typeof calculateSurveyPricing>;
export function formatUsdCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}
export function hasStudentClassification(profile: { role: string; affiliationType: string; position: string }) {
  return profile.role === "client" && profile.affiliationType === "university" &&
    ["Student", "Graduate Student", "PhD Candidate"].includes(profile.position);
}
export function assertSurveyAllowance(questionCount: number, questions: unknown) {
  if (!Array.isArray(questions) || questions.length < 5 || questions.length > questionCount)
    throw new SurveyPricingError("Prepare at least 5 questions without exceeding the selected question allowance.");
}
export function calculateAuthorizedSurveyPricing(input: unknown, eligibleCategory: PricingCategory) {
  const quote = calculateSurveyPricing(input);
  if (quote.pricingCategory !== eligibleCategory)
    throw new SurveyPricingError("Pricing category does not match your eligible account. Refresh the price before checkout.");
  return quote;
}
