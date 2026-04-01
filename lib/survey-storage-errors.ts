function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getSurveyStorageErrorMessage(error: unknown) {
  if (!isRecord(error)) {
    return null;
  }

  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "";
  const normalizedMessage = message.toLowerCase();

  if (code === "42P01" && normalizedMessage.includes("welcome_survey_completions")) {
    return "Welcome survey storage is not ready yet. Run the SQL in supabase/migrate-welcome-survey.sql in your Supabase SQL editor.";
  }

  if (
    code === "PGRST205" ||
    code === "42P01" ||
    normalizedMessage.includes("public.surveys") ||
    normalizedMessage.includes("welcome_survey_completions") ||
    normalizedMessage.includes("public.survey_notifications") ||
    normalizedMessage.includes("distribution_stage") ||
    normalizedMessage.includes("distribution_expires_at")
  ) {
    return "Supabase survey storage is not ready yet. Run the SQL in supabase/schema.sql and, for existing projects, the latest survey migration files including supabase/migrate-welcome-survey.sql.";
  }

  if (normalizedMessage.includes("first-stage community rollout")) {
    return message;
  }

  return null;
}
