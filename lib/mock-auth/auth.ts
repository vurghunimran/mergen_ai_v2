import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMockUserById } from "@/lib/mock-auth/mock-users";
import { MOCK_SESSION_COOKIE_NAME, verifyMockSessionToken } from "@/lib/mock-auth/session";

export function getAuthenticatedMockUser() {
  const token = cookies().get(MOCK_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = verifyMockSessionToken(token);

  if (!session) {
    return null;
  }

  return getMockUserById(session.userId);
}

export function requireAuthenticatedMockUser() {
  const user = getAuthenticatedMockUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
