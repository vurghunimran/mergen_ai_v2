import { redirect } from "next/navigation";
import ClientDashboard from "@/components/dashboard/ClientDashboard";
import { getAdminDashboardPath, isAdminIdentity } from "@/lib/admin-access";
import { getDashboardPathForRole, requireAuthenticatedProfile } from "@/lib/supabase/profile-server";
import { isAuthorizedDashboardRequest } from "@/lib/survey-authorization";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClientDashboardPage({ params }: PageProps) {
  const { profile, user } = await requireAuthenticatedProfile("client");
  const adminHref = isAdminIdentity(user) ? getAdminDashboardPath() : null;

  if (adminHref) {
    redirect(adminHref);
  }

  if (!isAuthorizedDashboardRequest(profile.id, (await params).id)) {
    redirect(`${getDashboardPathForRole("client", profile.id)}?error=access-denied`);
  }

  return <ClientDashboard initialProfile={profile} adminHref={adminHref} />;
}
