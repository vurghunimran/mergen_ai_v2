import { requireAuthenticatedProfile } from "@/lib/supabase/profile-server";
import CommunityDashboard from "@/components/dashboard/CommunityDashboard";

export const dynamic = "force-dynamic";

export default async function CommunityDashboardPage() {
  const { profile } = await requireAuthenticatedProfile("community");

  return <CommunityDashboard initialProfile={profile} />;
}
