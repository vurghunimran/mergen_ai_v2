import { requireAuthenticatedProfile } from "@/lib/supabase/profile-server";
import ClientDashboard from "@/components/dashboard/ClientDashboard";

export const dynamic = "force-dynamic";

export default async function ClientDashboardPage() {
  const { profile } = await requireAuthenticatedProfile("client");

  return <ClientDashboard initialProfile={profile} />;
}
