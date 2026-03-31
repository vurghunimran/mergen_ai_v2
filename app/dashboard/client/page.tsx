import { redirect } from "next/navigation";
import { getPostLoginPath } from "@/lib/admin-access";
import { requireAuthenticatedProfile } from "@/lib/supabase/profile-server";

export const dynamic = "force-dynamic";

function buildSearchString(searchParams?: Record<string, string | string[] | undefined>) {
  if (!searchParams) {
    return "";
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
      continue;
    }

    if (typeof value === "string") {
      params.set(key, value);
    }
  }

  const normalized = params.toString();
  return normalized ? `?${normalized}` : "";
}

export default async function ClientDashboardRedirectPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { profile } = await requireAuthenticatedProfile("client");
  const destination = getPostLoginPath({
    email: profile.email,
    role: profile.role,
    userId: profile.id
  });
  redirect(`${destination}${buildSearchString(searchParams)}`);
}
