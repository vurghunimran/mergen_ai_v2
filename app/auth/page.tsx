import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPostLoginPath } from "@/lib/admin-access";
import { getCurrentUserProfile } from "@/lib/supabase/profile-server";
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
    redirect(
      getPostLoginPath({
        email: authenticatedProfile.profile.email,
        role: authenticatedProfile.profile.role,
        userId: authenticatedProfile.profile.id
      })
    );
  }

  const requestHeaders = headers();
  const initialCommunityCountry = getDetectedCountryFromHeaders(requestHeaders);

  return <AuthClient initialType={searchParams?.type} initialCommunityCountry={initialCommunityCountry} />;
}
