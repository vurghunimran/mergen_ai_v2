import { requireAuthenticatedProfile } from "@/lib/supabase/profile-server";
import ClientDashboard from "@/components/dashboard/ClientDashboard";

export default async function ClientDashboardPage() {
  const { profile } = await requireAuthenticatedProfile("client");

  return <ClientDashboard initialProfile={profile} />;
}
