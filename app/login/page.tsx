import { redirect } from "next/navigation";
import LoginForm from "@/components/mock-auth/LoginForm";
import { getAuthenticatedMockUser } from "@/lib/mock-auth/auth";
import { getMockLoginUsers } from "@/lib/mock-auth/mock-users";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{
    next?: string;
  }>;
}) {
  const authenticatedUser = await getAuthenticatedMockUser();

  if (authenticatedUser) {
    redirect(`/dashboard/${authenticatedUser.id}`);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(216,90,47,0.12),transparent_22%),radial-gradient(circle_at_top_right,rgba(123,147,178,0.16),transparent_22%),linear-gradient(180deg,#fffdf9_0%,#f7f2eb_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <LoginForm
          demoUsers={getMockLoginUsers()}
          redirectedFromDashboard={Boolean((await searchParams)?.next)}
        />
      </div>
    </main>
  );
}
