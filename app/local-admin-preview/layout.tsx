import LocalAdminPreviewShell from "@/components/admin/LocalAdminPreviewShell";
import { requireLocalPreviewAccess } from "@/lib/local-preview-access";

export const dynamic = "force-dynamic";

export default function LocalAdminPreviewLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  requireLocalPreviewAccess();

  return <LocalAdminPreviewShell>{children}</LocalAdminPreviewShell>;
}
