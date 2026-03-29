import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUserProfile, getDashboardPathForRole } from "@/lib/supabase/profile-server";
import { getDetectedCountryFromHeaders } from "@/lib/request-country";
import AuthClient from "./AuthClient";

export const dynamic = "force-dynamic";

export default async function AuthPage({
  searchParams
}: {
  searchParams?: { type?: string };
}) {
  const authenticatedProfile = await getCurrentUserProfile();

  if (authenticatedProfile) {
    redirect(getDashboardPathForRole(authenticatedProfile.profile.role, authenticatedProfile.profile.id));
  }

  const requestHeaders = headers();
  const initialCommunityCountry = getDetectedCountryFromHeaders(requestHeaders);

  return <AuthClient initialType={searchParams?.type} initialCommunityCountry={initialCommunityCountry} />;
}
