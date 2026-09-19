import "server-only";
import { notFound } from "next/navigation";
import { requireAdminProfile } from "@/lib/admin-access";

export async function requireLocalPreviewAccess() {
  if (process.env.NODE_ENV !== "development" || process.env.ENABLE_LOCAL_ADMIN_PREVIEW !== "true") notFound();
  await requireAdminProfile();
}
