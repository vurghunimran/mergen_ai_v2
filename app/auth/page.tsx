import { redirect } from "next/navigation";
import { getCurrentUserProfile, getDashboardPathForRole } from "@/lib/supabase/profile-server";
import AuthClient from "./AuthClient";

export default async function AuthPage({
  searchParams
}: {
  searchParams?: { type?: string };
}) {
  const authenticatedProfile = await getCurrentUserProfile();

  if (authenticatedProfile) {
    redirect(getDashboardPathForRole(authenticatedProfile.profile.role));
  }

  return <AuthClient initialType={searchParams?.type} />;
}
