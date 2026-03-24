import { redirect } from "next/navigation";
import ClientSurveyDetails from "@/components/dashboard/ClientSurveyDetails";
import { getClientSurveyForUser } from "@/lib/survey-db";
import { getDashboardPathForRole, requireAuthenticatedProfile } from "@/lib/supabase/profile-server";
import { createClient } from "@/lib/supabase/server";
import { isAuthorizedDashboardRequest } from "@/lib/survey-authorization";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
    surveyId: string;
  };
};

function parseSurveyId(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function ClientSurveyDetailsPage({ params }: PageProps) {
  const { profile } = await requireAuthenticatedProfile("client");
  const dashboardPath = getDashboardPathForRole("client", profile.id);

  if (!isAuthorizedDashboardRequest(profile.id, params.id)) {
    redirect(`${dashboardPath}?error=access-denied`);
  }

  const surveyId = parseSurveyId(params.surveyId);

  if (!surveyId) {
    redirect(`${dashboardPath}?error=access-denied`);
  }

  const supabase = createClient();
  const survey = await getClientSurveyForUser(supabase, surveyId, profile.id);

  if (!survey) {
    redirect(`${dashboardPath}?error=access-denied`);
  }

  return <ClientSurveyDetails survey={survey} userId={profile.id} />;
}
