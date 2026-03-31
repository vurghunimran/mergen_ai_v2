import { redirect } from "next/navigation";
import CommunityDashboard from "@/components/dashboard/CommunityDashboard";
import { getAdminDashboardPath, isAdminEmail } from "@/lib/admin-access";
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
  const adminHref = isAdminEmail(profile.email) ? getAdminDashboardPath() : null;

  if (!isAuthorizedDashboardRequest(profile.id, params.id)) {
    redirect(`${getDashboardPathForRole("community", profile.id)}?error=access-denied`);
  }

  return <CommunityDashboard initialProfile={profile} adminHref={adminHref} />;
}
