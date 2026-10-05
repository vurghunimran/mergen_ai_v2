import { getAdminAnalytics } from "@/lib/admin-analytics";
import BusinessOverview from "@/components/admin/BusinessOverview";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  return <BusinessOverview data={await getAdminAnalytics((await searchParams).period)} />;
}
