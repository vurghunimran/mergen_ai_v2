import { redirect } from "next/navigation";
import DashboardState from "@/components/mock-auth/DashboardState";
import UserDashboard from "@/components/mock-auth/UserDashboard";
import { getAuthenticatedMockUser } from "@/lib/mock-auth/auth";
import { getMockUserById } from "@/lib/mock-auth/mock-users";

export const dynamic = "force-dynamic";

export default function MockDashboardPage({
  params
}: {
  params: {
    id: string;
  };
}) {
  const authenticatedUser = getAuthenticatedMockUser();

  if (!authenticatedUser) {
    redirect(`/login?next=/dashboard/${params.id}`);
  }

  const requestedUser = getMockUserById(params.id);

  if (!requestedUser) {
    return (
      <DashboardState
        title="User not found"
        description={`No dashboard exists for the user ID "${params.id}". Use a valid demo user ID to open a dashboard.`}
        primaryHref={`/dashboard/${authenticatedUser.id}`}
        primaryLabel="Open my dashboard"
        secondaryHref="/login"
        secondaryLabel="Back to login"
      />
    );
  }

  if (requestedUser.id !== authenticatedUser.id) {
    return (
      <DashboardState
        title="Access denied"
        description={`You are signed in as ${authenticatedUser.name}. This route belongs to another user, so you can only view your own dashboard data.`}
        primaryHref={`/dashboard/${authenticatedUser.id}`}
        primaryLabel="Open my dashboard"
        secondaryHref="/login"
        secondaryLabel="Switch account"
      />
    );
  }

  return <UserDashboard user={requestedUser} />;
}
