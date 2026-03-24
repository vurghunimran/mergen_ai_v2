import { NextResponse } from "next/server";
import type { UserProfile, UserRole } from "@/lib/supabase/types";
import { getCurrentUserProfile } from "@/lib/supabase/profile-server";

export type AuthorizedProfileResult =
  | {
      profile: UserProfile;
      response: null;
    }
  | {
      profile: null;
      response: NextResponse;
    };

export async function requireAuthorizedProfile(requiredRole?: UserRole): Promise<AuthorizedProfileResult> {
  const authenticated = await getCurrentUserProfile();

  if (!authenticated) {
    return {
      profile: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  if (requiredRole && authenticated.profile.role !== requiredRole) {
    return {
      profile: null,
      response: NextResponse.json({ error: "Access denied" }, { status: 403 })
    };
  }

  return {
    profile: authenticated.profile,
    response: null
  };
}

export function buildForbiddenSurveyResponse() {
  return NextResponse.json({ error: "403 Unauthorized" }, { status: 403 });
}

export function isAuthorizedDashboardRequest(authenticatedUserId: string, requestedUserId: string) {
  return authenticatedUserId === requestedUserId;
}
