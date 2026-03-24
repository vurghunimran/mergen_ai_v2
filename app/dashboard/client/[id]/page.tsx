import { redirect } from "next/navigation";
import ClientDashboard from "@/components/dashboard/ClientDashboard";
import { getDashboardPathForRole, requireAuthenticatedProfile } from "@/lib/supabase/profile-server";
import { isAuthorizedDashboardRequest } from "@/lib/survey-authorization";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function ClientDashboardPage({ params }: PageProps) {
  const { profile } = await requireAuthenticatedProfile("client");

  if (!isAuthorizedDashboardRequest(profile.id, params.id)) {
    redirect(`${getDashboardPathForRole("client", profile.id)}?error=access-denied`);
  }

  return <ClientDashboard initialProfile={profile} />;
}
