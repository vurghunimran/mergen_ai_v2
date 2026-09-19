import type { SurveyCheckoutPayload } from "@/lib/dashboard-data";
import { validateSurveyAttachmentsInput } from "@/lib/survey-attachments";
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseCreateSurveyPayload(body: unknown): {
  payload: SurveyCheckoutPayload | null;
  error?: string;
} {
  if (!isObject(body)) {
    return {
      payload: null,
      error: "Invalid survey payload."
    };
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const researchDescription = typeof body.researchDescription === "string" ? body.researchDescription.trim() : "";
  const researchScope = typeof body.researchScope === "string" ? body.researchScope.trim() : "";
  const hypothesis = typeof body.hypothesis === "string" ? body.hypothesis.trim() : "";
  const targetResponses = typeof body.targetResponses === "number" ? body.targetResponses : 0;
  const questionCount = typeof body.questionCount === "number" ? body.questionCount : 0;
  const audience = isObject(body.audience) ? body.audience : null;
  const questions = Array.isArray(body.questions) ? body.questions : null;
  const { attachments, error: attachmentError } = validateSurveyAttachmentsInput(body.attachments);

  if (attachmentError) {
    return {
      payload: null,
      error: attachmentError
    };
  }

  if (typeof body.includeDetailedAI !== "boolean" || !title || !description || !researchDescription || targetResponses <= 0 || questionCount <= 0 || !audience || !questions) {
    return {
      payload: null,
      error: "Invalid survey payload."
    };
  }

  const types = ["Multiple choice","Single select","Likert scale","Open question","Yes / No","Rating scale","Ranking"];
  if (![5,10,15,20,25].includes(questionCount) || ![50,100,250,500,1000].includes(targetResponses) || questions.length < 5 || questions.length > questionCount ||
      new Set(questions.map(q => isObject(q) ? q.id : null)).size !== questions.length ||
      questions.some(q => !isObject(q) || typeof q.id !== "string" || !q.id || typeof q.text !== "string" || !q.text.trim() || q.text.length > 2000 || !types.includes(q.type as string) || !Array.isArray(q.options) || q.options.length > 30 || q.options.some(o => typeof o !== "string" || o.length > 1000)) ||
      !Array.isArray(audience.countries) || audience.countries.length > 80 || audience.countries.some(c => typeof c !== "string") ||
      !Array.isArray(audience.interests) || audience.interests.length > 80 || audience.interests.some(c => typeof c !== "string") ||
      !Number.isInteger(audience.ageMin) || !Number.isInteger(audience.ageMax) || Number(audience.ageMin) < 18 || Number(audience.ageMax) > 120 || Number(audience.ageMin) > Number(audience.ageMax) ||
      [audience.gender,audience.education,audience.researchArea].some(v => typeof v !== "string") ||
      [title, description, researchDescription, researchScope, hypothesis].some(v => v.length > 12000)) return {payload:null,error:"Invalid questions or audience."};
  return {
    payload: {
      title,
      checkoutId: typeof body.checkoutId === "string" ? body.checkoutId : undefined,
      targetResponses,
      questionCount,
      description,
      researchDescription,
      researchScope,
      hypothesis,
      audience: audience as SurveyCheckoutPayload["audience"],
      questions: questions as SurveyCheckoutPayload["questions"],
      includeDetailedAI: Boolean(body.includeDetailedAI),
      attachments
    }
  };
}

