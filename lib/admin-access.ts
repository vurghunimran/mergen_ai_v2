import { redirect } from "next/navigation";
import { getCurrentUserProfile, getDashboardPathForRole } from "@/lib/supabase/profile-server";
import type { UserRole } from "@/lib/supabase/types";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getConfiguredAdminEmails() {
  return [process.env.ADMIN_EMAIL ?? "", process.env.ADMIN_EMAILS ?? ""]
    .filter(Boolean)
    .join(",")
    .split(/[\n,]/)
    .map((value) => normalizeEmail(value))
    .filter(Boolean);
}

export function getAdminDashboardPath() {
  return "/dashboard/admin";
}

export function getPostLoginPath(params: {
  email: string;
  role: UserRole;
  userId: string;
  emailConfirmed?: boolean;
}) {
  if (isAdminIdentity({ id: params.userId, email: params.email, email_confirmed_at: params.emailConfirmed ? "confirmed" : null })) {
    return getAdminDashboardPath();
  }

  return getDashboardPathForRole(params.role, params.userId);
}

export function isAdminEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  return getConfiguredAdminEmails().includes(normalizedEmail);
}

export async function requireAdminProfile() {
  const authenticatedProfile = await getCurrentUserProfile();

  if (!authenticatedProfile) {
    redirect("/auth?type=client");
  }

  const allowed = isAdminIdentity(authenticatedProfile.user);
  if (!allowed) {
    redirect(
      getDashboardPathForRole(authenticatedProfile.profile.role, authenticatedProfile.profile.id)
    );
  }

  return authenticatedProfile;
}

export function isAdminIdentity(user: {id: string; email?: string; email_confirmed_at?: string | null}) {
  const ids = (process.env.ADMIN_USER_IDS ?? "").split(/[\n,]/).map(id=>id.trim()).filter(Boolean);
  return ids.length ? ids.includes(user.id) : Boolean(user.email_confirmed_at && isAdminEmail(user.email ?? ""));
}
