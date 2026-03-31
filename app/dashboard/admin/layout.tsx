import AdminShell from "@/components/admin/AdminShell";
import { requireAdminProfile } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile } = await requireAdminProfile();

  return <AdminShell profile={profile}>{children}</AdminShell>;
}
