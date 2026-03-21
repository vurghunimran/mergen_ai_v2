import { requireAuthenticatedProfile } from "@/lib/supabase/profile-server";
import CommunityDashboard from "@/components/dashboard/CommunityDashboard";

export default async function CommunityDashboardPage() {
  const { profile } = await requireAuthenticatedProfile("community");

  return <CommunityDashboard initialProfile={profile} />;
}
