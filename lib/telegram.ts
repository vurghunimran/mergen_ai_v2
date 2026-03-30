import { getAppBaseUrl } from "@/lib/email/config";

type TelegramReplyMarkup = Record<string, unknown>;

type TelegramSendMessageOptions = {
  chatId: string;
  text: string;
  replyMarkup?: TelegramReplyMarkup;
  disableWebPagePreview?: boolean;
};

type TelegramSendMessageResult = {
  message_id: number;
};

type TelegramApiSuccess<T> = {
  ok: true;
  result: T;
};

type TelegramApiFailure = {
  ok: false;
  error_code: number;
  description: string;
};

type SurveyLaunchTelegramInput = {
  firstName: string;
  title: string;
  description: string;
  questionCount: number;
  targetResponses: number;
  dashboardUrl: string;
};

function normalizeTelegramUsername(value: string) {
  return value.trim().replace(/^@+/, "");
}

export class TelegramApiRequestError extends Error {
  statusCode: number | null;

  description: string;

  constructor(message: string, statusCode: number | null, description: string) {
    super(message);
    this.name = "TelegramApiRequestError";
    this.statusCode = statusCode;
    this.description = description;
  }
}

export function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
}

export function getTelegramBotUsername() {
  const rawValue = process.env.TELEGRAM_BOT_USERNAME?.trim() || "";
  return rawValue ? normalizeTelegramUsername(rawValue) : "";
}

export function isTelegramBotConfigured() {
  return Boolean(getTelegramBotToken());
}

export function isTelegramActivationConfigured() {
  return Boolean(getTelegramBotToken() && getTelegramBotUsername());
}

export function isAuthorizedTelegramWebhookRequest(request: Request) {
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  if (!secretToken) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("x-telegram-bot-api-secret-token") === secretToken;
}

export function buildTelegramStartUrl(token: string) {
  const botUsername = getTelegramBotUsername();

  if (!botUsername) {
    throw new Error("Missing TELEGRAM_BOT_USERNAME.");
  }

  return `https://t.me/${botUsername}?start=${encodeURIComponent(token)}`;
}

function getTelegramApiUrl(method: string) {
  const botToken = getTelegramBotToken();

  if (!botToken) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN.");
  }

  return `https://api.telegram.org/bot${botToken}/${method}`;
}

async function callTelegramApi<T>(method: string, payload: Record<string, unknown>) {
  const response = await fetch(getTelegramApiUrl(method), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  const responseBody =
    (await response.json().catch(() => null)) as
      | TelegramApiSuccess<T>
      | TelegramApiFailure
      | null;

  if (!response.ok || !responseBody?.ok) {
    const description =
      responseBody && "description" in responseBody
        ? responseBody.description
        : `Telegram API request failed for ${method}.`;
    const statusCode =
      responseBody && "error_code" in responseBody
        ? responseBody.error_code
        : response.status || null;

    throw new TelegramApiRequestError(description, statusCode, description);
  }

  return responseBody.result;
}

export async function sendTelegramMessage({
  chatId,
  text,
  replyMarkup,
  disableWebPagePreview = true
}: TelegramSendMessageOptions) {
  return callTelegramApi<TelegramSendMessageResult>("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: disableWebPagePreview,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

export function shouldDisableTelegramSubscription(error: unknown) {
  if (!(error instanceof TelegramApiRequestError)) {
    return false;
  }

  const normalizedDescription = error.description.toLowerCase();

  return (
    normalizedDescription.includes("bot was blocked by the user") ||
    normalizedDescription.includes("chat not found") ||
    normalizedDescription.includes("user is deactivated")
  );
}

export function buildSurveyLaunchTelegramMessage(input: SurveyLaunchTelegramInput) {
  return [
    `Hi ${input.firstName},`,
    "",
    "A new survey matching your MERGEN AI profile is now available.",
    "",
    input.title,
    input.description,
    `Questions: ${input.questionCount}`,
    `Target responses: ${input.targetResponses}`,
    "",
    `Open your dashboard: ${input.dashboardUrl}`
  ].join("\n");
}

export function buildCommunitySettingsUrl(request?: Request) {
  const baseUrl = getAppBaseUrl(request);
  return baseUrl ? `${baseUrl}/dashboard/community?section=settings&telegram=setup` : "";
}
