import { NextResponse } from "next/server";
import { findMockUserByCredentials } from "@/lib/mock-auth/mock-users";
import {
  createMockSessionToken,
  getMockSessionCookieOptions,
  MOCK_SESSION_COOKIE_NAME
} from "@/lib/mock-auth/session";

type LoginRequestBody = {
  email?: string;
  password?: string;
};

function getStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  let body: LoginRequestBody;

  try {
    body = (await request.json()) as LoginRequestBody;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request body."
      },
      { status: 400 }
    );
  }

  const email = getStringValue(body.email).trim().toLowerCase();
  const password = getStringValue(body.password);

  if (!email || !password) {
    return NextResponse.json(
      {
        error: "Email and password are required."
      },
      { status: 400 }
    );
  }

  const user = findMockUserByCredentials(email, password);

  if (!user) {
    return NextResponse.json(
      {
        error: "Invalid email or password."
      },
      { status: 401 }
    );
  }

  const response = NextResponse.json({
    redirectTo: `/dashboard/${user.id}`,
    userId: user.id
  });

  response.cookies.set(MOCK_SESSION_COOKIE_NAME, createMockSessionToken(user.id), getMockSessionCookieOptions());

  return response;
}
