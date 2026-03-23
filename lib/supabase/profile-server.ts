import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { AVATAR_METADATA_KEYS, resolveAvatarSelection } from "@/lib/profile-avatars";
import { createClient } from "@/lib/supabase/server";
import {
  isUserRole,
  type BaseProfileRow,
  type ClientProfileRow,
  type CommunityProfileRow,
  type UserProfile,
  type UserRole
} from "@/lib/supabase/types";

type AuthenticatedProfile = {
  user: User;
  profile: UserProfile;
};

function getStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapProfile(
  user: User,
  baseRow: BaseProfileRow | null,
  clientRow: ClientProfileRow | null,
  communityRow: CommunityProfileRow | null
): UserProfile {
  const metadata = user.user_metadata ?? {};
  const roleValue = baseRow?.role ?? metadata.role;
  const role: UserRole = isUserRole(roleValue) ? roleValue : "community";
  const roleCountry = role === "client" ? clientRow?.country : communityRow?.country;
  const avatarSelection = resolveAvatarSelection(
    role,
    metadata[AVATAR_METADATA_KEYS.mode],
    metadata[AVATAR_METADATA_KEYS.preset],
    metadata[AVATAR_METADATA_KEYS.customDataUrl]
  );

  return {
    id: user.id,
    role,
    email: baseRow?.email ?? user.email ?? getStringValue(metadata.email),
    firstName: baseRow?.first_name ?? getStringValue(metadata.first_name),
    lastName: baseRow?.last_name ?? getStringValue(metadata.last_name),
    phoneNumber: baseRow?.phone_number ?? getStringValue(metadata.phone_number),
    country: roleCountry ?? getStringValue(metadata.country),
    educationalInstitution:
      clientRow?.educational_institution ?? getStringValue(metadata.educational_institution),
    position: clientRow?.position ?? getStringValue(metadata.position),
    ageSpan: communityRow?.age_span ?? getStringValue(metadata.age_span),
    gender: communityRow?.gender ?? getStringValue(metadata.gender),
    salaryRange: communityRow?.salary_range ?? getStringValue(metadata.salary_range),
    educationalLevel: communityRow?.educational_level ?? getStringValue(metadata.educational_level),
    placeOfResidence: communityRow?.place_of_residence ?? getStringValue(metadata.place_of_residence),
    familyStatus: communityRow?.family_status ?? getStringValue(metadata.family_status),
    interests: communityRow?.interests ?? getStringArray(metadata.interests),
    carCount: communityRow?.car_count ?? getStringValue(metadata.car_count),
    appearance: baseRow?.appearance === "dark" ? "dark" : "light",
    twoFactorEnabled: Boolean(baseRow?.two_factor_enabled ?? metadata.two_factor_enabled),
    avatarMode: avatarSelection.avatarMode,
    avatarPreset: avatarSelection.avatarPreset,
    avatarCustomDataUrl: avatarSelection.avatarCustomDataUrl
  };
}

export function getDashboardPathForRole(role: UserRole) {
  return role === "client" ? "/dashboard/client" : "/dashboard/community";
}

export async function getCurrentUserProfile(): Promise<AuthenticatedProfile | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const { data: baseRow } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    const roleValue = baseRow?.role ?? user.user_metadata?.role;
    const role: UserRole = isUserRole(roleValue) ? roleValue : "community";

    const { data: clientRow } =
      role === "client"
        ? await supabase.from("client_profiles").select("*").eq("id", user.id).maybeSingle()
        : { data: null };

    const { data: communityRow } =
      role === "community"
        ? await supabase.from("community_profiles").select("*").eq("id", user.id).maybeSingle()
        : { data: null };

    return {
      user,
      profile: mapProfile(
        user,
        (baseRow as BaseProfileRow | null) ?? null,
        (clientRow as ClientProfileRow | null) ?? null,
        (communityRow as CommunityProfileRow | null) ?? null
      )
    };
  } catch (error) {
    console.error("Supabase server profile lookup failed.", error);
    return null;
  }
}

export async function requireAuthenticatedProfile(requiredRole?: UserRole) {
  const authenticatedProfile = await getCurrentUserProfile();

  if (!authenticatedProfile) {
    redirect(`/auth?type=${requiredRole ?? "client"}`);
  }

  if (requiredRole && authenticatedProfile.profile.role !== requiredRole) {
    redirect(getDashboardPathForRole(authenticatedProfile.profile.role));
  }

  return authenticatedProfile;
}
