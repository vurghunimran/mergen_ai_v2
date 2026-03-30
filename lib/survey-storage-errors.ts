function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getSurveyStorageErrorMessage(error: unknown) {
  if (!isRecord(error)) {
    return null;
  }

  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "";

  if (
    code === "PGRST205" ||
    code === "42P01" ||
    message.toLowerCase().includes("public.surveys") ||
    message.toLowerCase().includes("public.survey_notifications") ||
    message.toLowerCase().includes("distribution_stage") ||
    message.toLowerCase().includes("distribution_expires_at")
  ) {
    return "Supabase survey storage is not ready yet. Run the SQL in supabase/schema.sql and, for existing projects, supabase/migrate-survey-distribution.sql.";
  }

  if (message.toLowerCase().includes("first-stage community rollout")) {
    return message;
  }

  return null;
}
