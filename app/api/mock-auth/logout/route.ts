import { NextResponse } from "next/server";
import { getMockSessionCookieOptions, MOCK_SESSION_COOKIE_NAME } from "@/lib/mock-auth/session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);

  response.cookies.set(MOCK_SESSION_COOKIE_NAME, "", {
    ...getMockSessionCookieOptions(),
    maxAge: 0
  });

  return response;
}
