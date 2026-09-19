import LocalAdminPreviewShell from "@/components/admin/LocalAdminPreviewShell";
import { requireLocalPreviewAccess } from "@/lib/local-preview-access";

export const dynamic = "force-dynamic";

export default async function LocalAdminPreviewLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireLocalPreviewAccess();

  return <LocalAdminPreviewShell>{children}</LocalAdminPreviewShell>;
}
