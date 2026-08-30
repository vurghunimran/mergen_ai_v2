import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTelegramBotToken } from "@/lib/telegram";

export const TELEGRAM_SURVEY_SESSION_HOURS = 72;

export function createTelegramSurveyToken() {
  return randomBytes(32).toString("base64url");
}

export function hashTelegramSurveyToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyTelegramInitData(initData: string) {
  const botToken = getTelegramBotToken();
  if (!botToken || !initData) return null;

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash") || "";
  const authDate = Number(params.get("auth_date"));
  const userJson = params.get("user") || "";
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (
    !/^[a-f0-9]{64}$/i.test(receivedHash) ||
    !timingSafeEqual(Buffer.from(receivedHash, "hex"), Buffer.from(calculatedHash, "hex")) ||
    !Number.isFinite(authDate) ||
    Math.abs(Date.now() / 1000 - authDate) > 24 * 60 * 60
  ) return null;

  try {
    const user = JSON.parse(userJson) as { id?: number };
    return user.id ? String(user.id) : null;
  } catch {
    return null;
  }
}

export async function resolveTelegramSurveySession(
  admin: SupabaseClient,
  token: string,
  initData: string
) {
  if (!token || token.length > 200) return { error: "This survey link is invalid.", status: 401 } as const;

  const { data: session, error } = await admin
    .from("telegram_survey_sessions")
    .select("token_hash,survey_id,user_id,telegram_chat_id,status,expires_at,started_at,answers")
    .eq("token_hash", hashTelegramSurveyToken(token))
    .maybeSingle();

  if (error || !session) return { error: "This survey link is invalid or no longer available.", status: 401 } as const;
  if (session.status === "completed") return { error: "You have already submitted this survey.", status: 409 } as const;
  if (session.status !== "active" || new Date(session.expires_at).getTime() <= Date.now()) {
    return { error: "This survey link has expired.", status: 410 } as const;
  }

  const telegramUserId = verifyTelegramInitData(initData);
  if (!telegramUserId && process.env.NODE_ENV === "production") {
    return { error: "Open this survey from the MERGEN AI Telegram bot.", status: 401 } as const;
  }

  if (telegramUserId) {
    const { data: subscription } = await admin
      .from("telegram_notification_subscriptions")
      .select("user_id,telegram_chat_id")
      .eq("user_id", session.user_id)
      .eq("telegram_user_id", telegramUserId)
      .eq("telegram_chat_id", session.telegram_chat_id)
      .eq("notifications_enabled", true)
      .maybeSingle();
    if (!subscription) return { error: "This survey link belongs to another Telegram account.", status: 403 } as const;
  }

  return { session } as const;
}
