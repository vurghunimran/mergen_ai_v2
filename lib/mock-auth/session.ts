import { createHmac, timingSafeEqual } from "crypto";

export const MOCK_SESSION_COOKIE_NAME = "mergen_mock_session";
export const MOCK_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  userId: string;
  expiresAt: number;
};

function getSessionSecret() {
  return process.env.MOCK_AUTH_SECRET ?? "mergen-mock-auth-demo-secret";
}

function createSignature(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

export function getMockSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: MOCK_SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production"
  };
}

export function createMockSessionToken(userId: string) {
  const expiresAt = Date.now() + MOCK_SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${userId}.${expiresAt}`;
  const signature = createSignature(payload);

  return Buffer.from(`${payload}.${signature}`, "utf8").toString("base64url");
}

export function verifyMockSessionToken(token: string): SessionPayload | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [userId, expiresAtValue, signature] = decoded.split(".");

    if (!userId || !expiresAtValue || !signature) {
      return null;
    }

    const payload = `${userId}.${expiresAtValue}`;
    const expectedSignature = createSignature(payload);

    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const expiresAt = Number(expiresAtValue);

    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return null;
    }

    return {
      userId,
      expiresAt
    };
  } catch {
    return null;
  }
}
