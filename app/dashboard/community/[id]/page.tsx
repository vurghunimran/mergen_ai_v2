import { redirect } from "next/navigation";
import CommunityDashboard from "@/components/dashboard/CommunityDashboard";
import { getAdminDashboardPath, isAdminIdentity } from "@/lib/admin-access";
import { getDashboardPathForRole, requireAuthenticatedProfile } from "@/lib/supabase/profile-server";
import { isAuthorizedDashboardRequest } from "@/lib/survey-authorization";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CommunityDashboardPage({ params }: PageProps) {
  const { profile, user } = await requireAuthenticatedProfile("community");
  const adminHref = isAdminIdentity(user) ? getAdminDashboardPath() : null;

  if (!isAuthorizedDashboardRequest(profile.id, (await params).id)) {
    redirect(`${getDashboardPathForRole("community", profile.id)}?error=access-denied`);
  }

  return <CommunityDashboard initialProfile={profile} adminHref={adminHref} />;
}
