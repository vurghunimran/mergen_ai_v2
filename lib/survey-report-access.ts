import type { ClientSurvey } from "@/lib/dashboard-data";

// Match the platform's lifecycle: target reached, collection window expired,
// or collection explicitly ended by archiving the survey.
export function isSurveyFinished(survey: Pick<ClientSurvey, "status" | "responses" | "targetResponses" | "distributionExpiresAt" | "daysRemaining">, now = Date.now()) {
  return survey.status === "archived" || survey.status === "completed" ||
    (survey.status === "published" && (
      (survey.targetResponses > 0 && survey.responses >= survey.targetResponses) ||
      (survey.distributionExpiresAt
        ? new Date(survey.distributionExpiresAt).getTime() <= now
        : survey.daysRemaining <= 0)
    ));
}

export function getSurveyReportAccessError(survey: ClientSurvey) {
  if (!survey.includeDetailedAI) return { status: 403, error: "AI-generated summaries require the $20 add-on." };
  if (!isSurveyFinished(survey)) return { status: 409, error: "Your AI-generated summary will be available once the survey finishes." };
  if (!survey.rawResponses?.length) return { status: 400, error: "No responses are available to summarize for this survey." };
  return null;
}
