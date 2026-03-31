import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LocalAdminPreviewRedirectPage() {
  redirect("/local-admin-preview/surveys");
}
