import { redirect } from "next/navigation";
import CommunityDashboard from "@/components/dashboard/CommunityDashboard";
import { getDashboardPathForRole, requireAuthenticatedProfile } from "@/lib/supabase/profile-server";
import { isAuthorizedDashboardRequest } from "@/lib/survey-authorization";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function CommunityDashboardPage({ params }: PageProps) {
  const { profile } = await requireAuthenticatedProfile("community");

  if (!isAuthorizedDashboardRequest(profile.id, params.id)) {
    redirect(`${getDashboardPathForRole("community", profile.id)}?error=access-denied`);
  }

  return <CommunityDashboard initialProfile={profile} />;
}
