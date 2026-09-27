import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getMockUserById } from "@/lib/mock-auth/mock-users";
import { MOCK_SESSION_COOKIE_NAME, verifyMockSessionToken } from "@/lib/mock-auth/session";

export async function getAuthenticatedMockUser() {
  if (process.env.NODE_ENV === "production") return null;
  const token = (await cookies()).get(MOCK_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = verifyMockSessionToken(token);

  if (!session) {
    return null;
  }

  return getMockUserById(session.userId);
}

export async function requireAuthenticatedMockUser() {
  if (process.env.NODE_ENV === "production") notFound();
  const user = await getAuthenticatedMockUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
