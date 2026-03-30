import { NextResponse } from "next/server";
import { buildCommunitySettingsUrl } from "@/lib/telegram";
import { getPhoneComparisonKey } from "@/lib/phone-number";
import {
  isAuthorizedTelegramWebhookRequest,
  sendTelegramMessage
} from "@/lib/telegram";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type TelegramMessage = {
  text?: string;
  chat?: {
    id: number | string;
    type?: string;
  };
  from?: {
    id: number | string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  contact?: {
    phone_number: string;
    user_id?: number | string;
  };
};

type TelegramUpdate = {
  message?: TelegramMessage;
};

type TelegramLinkTokenRow = {
  token: string;
  user_id: string;
  phone_number: string;
  phone_number_normalized: string;
  telegram_chat_id: string | null;
  expires_at: string;
  consumed_at: string | null;
};

type TelegramSubscriptionRow = {
  user_id: string;
};

function toTelegramId(value: number | string | undefined) {
  if (typeof value === "number" || typeof value === "string") {
    return String(value);
  }

  return "";
}

function extractStartToken(text: string | undefined) {
  const normalizedText = text?.trim() || "";

  if (!normalizedText.startsWith("/start")) {
    return "";
  }

  const [, token = ""] = normalizedText.split(/\s+/, 2);
  return token.trim();
}

async function sendWebhookMessage(
  chatId: string,
  text: string,
  replyMarkup?: Record<string, unknown>
) {
  if (!chatId) {
    return;
  }

  try {
    await sendTelegramMessage({
      chatId,
      text,
      replyMarkup
    });
  } catch (error) {
    console.error("Telegram webhook reply failed.", error);
  }
}

export async function POST(request: Request) {
  if (!isAuthorizedTelegramWebhookRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized Telegram webhook." }, { status: 401 });
  }

  const update =
    ((await request.json().catch(() => null)) as TelegramUpdate | null) ?? {};
  const message = update.message;
  const chatId = toTelegramId(message?.chat?.id);
  const fromId = toTelegramId(message?.from?.id);

  if (!message || message.chat?.type !== "private" || !chatId) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  const dashboardUrl = buildCommunitySettingsUrl(request);
  const trimmedText = message.text?.trim() || "";
  const startToken = extractStartToken(trimmedText);

  if (trimmedText === "/stop") {
    await admin
      .from("telegram_notification_subscriptions")
      .update({
        notifications_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_chat_id", chatId);

    await sendWebhookMessage(
      chatId,
      dashboardUrl
        ? `Telegram alerts are now paused. Re-enable them anytime from your MERGEN settings: ${dashboardUrl}`
        : "Telegram alerts are now paused. Re-enable them anytime from your MERGEN settings."
    );

    return NextResponse.json({ ok: true });
  }

  if (startToken) {
    const { data, error } = await admin
      .from("telegram_link_tokens")
      .select(
        "token,user_id,phone_number,phone_number_normalized,telegram_chat_id,expires_at,consumed_at"
      )
      .eq("token", startToken)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("Telegram token lookup failed.", error);
      await sendWebhookMessage(
        chatId,
        "We could not verify this activation link right now. Please try again from the MERGEN website."
      );
      return NextResponse.json({ ok: true });
    }

    const tokenRow = (data as TelegramLinkTokenRow | null) ?? null;

    if (!tokenRow) {
      await sendWebhookMessage(
        chatId,
        "This activation link is invalid or expired. Please request a fresh Telegram activation link from MERGEN settings."
      );
      return NextResponse.json({ ok: true });
    }

    await admin
      .from("telegram_link_tokens")
      .update({
        telegram_chat_id: chatId,
        telegram_user_id: fromId || null
      })
      .eq("token", tokenRow.token);

    await sendWebhookMessage(
      chatId,
      `Almost done. Share the same phone number you saved in MERGEN: ${tokenRow.phone_number}`,
      {
        keyboard: [[{ text: "Share phone number", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    );

    return NextResponse.json({ ok: true });
  }

  if (message.contact?.phone_number) {
    const { data, error } = await admin
      .from("telegram_link_tokens")
      .select(
        "token,user_id,phone_number,phone_number_normalized,telegram_chat_id,expires_at,consumed_at"
      )
      .eq("telegram_chat_id", chatId)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Telegram active token lookup failed.", error);
      await sendWebhookMessage(
        chatId,
        "We could not complete Telegram activation right now. Please request a fresh link from MERGEN settings."
      );
      return NextResponse.json({ ok: true });
    }

    const tokenRow = (data as TelegramLinkTokenRow | null) ?? null;

    if (!tokenRow) {
      await sendWebhookMessage(
        chatId,
        "Start Telegram activation from the MERGEN website first, then come back here to share your phone number."
      );
      return NextResponse.json({ ok: true });
    }

    if (message.contact.user_id && fromId && toTelegramId(message.contact.user_id) !== fromId) {
      await sendWebhookMessage(
        chatId,
        "Please share your own phone number from Telegram so we can verify your MERGEN account."
      );
      return NextResponse.json({ ok: true });
    }

    if (
      getPhoneComparisonKey(message.contact.phone_number) !==
      tokenRow.phone_number_normalized
    ) {
      await sendWebhookMessage(
        chatId,
        `That phone number does not match the one saved in MERGEN (${tokenRow.phone_number}). Update it in your profile or try again with the matching number.`
      );
      return NextResponse.json({ ok: true });
    }

    const { data: existingChatSubscription } = await admin
      .from("telegram_notification_subscriptions")
      .select("user_id")
      .eq("telegram_chat_id", chatId)
      .maybeSingle();

    const existingSubscription =
      (existingChatSubscription as TelegramSubscriptionRow | null) ?? null;

    if (existingSubscription && existingSubscription.user_id !== tokenRow.user_id) {
      await sendWebhookMessage(
        chatId,
        "This Telegram chat is already linked to a different MERGEN account. Disconnect it there first before linking a new account."
      );
      return NextResponse.json({ ok: true });
    }

    const linkedAt = new Date().toISOString();

    const { error: upsertError } = await admin
      .from("telegram_notification_subscriptions")
      .upsert(
        {
          user_id: tokenRow.user_id,
          phone_number: tokenRow.phone_number,
          phone_number_normalized: tokenRow.phone_number_normalized,
          telegram_chat_id: chatId,
          telegram_user_id: fromId || null,
          telegram_username: message.from?.username ?? null,
          telegram_first_name: message.from?.first_name ?? null,
          telegram_last_name: message.from?.last_name ?? null,
          notifications_enabled: true,
          linked_at: linkedAt,
          verified_at: linkedAt,
          updated_at: linkedAt
        },
        {
          onConflict: "user_id"
        }
      );

    if (upsertError) {
      console.error("Telegram subscription upsert failed.", upsertError);
      await sendWebhookMessage(
        chatId,
        "We could not save your Telegram link right now. Please try again from MERGEN settings."
      );
      return NextResponse.json({ ok: true });
    }

    await admin
      .from("telegram_link_tokens")
      .update({
        consumed_at: linkedAt,
        telegram_chat_id: chatId,
        telegram_user_id: fromId || null
      })
      .eq("user_id", tokenRow.user_id)
      .is("consumed_at", null);

    await sendWebhookMessage(
      chatId,
      dashboardUrl
        ? `Telegram alerts are active for ${tokenRow.phone_number}. We will send new survey notifications here. Manage them anytime in MERGEN settings: ${dashboardUrl}`
        : `Telegram alerts are active for ${tokenRow.phone_number}. We will send new survey notifications here.`,
      {
        remove_keyboard: true
      }
    );

    return NextResponse.json({ ok: true });
  }

  await sendWebhookMessage(
    chatId,
    dashboardUrl
      ? `Open MERGEN settings to activate Telegram alerts, then come back here: ${dashboardUrl}`
      : "Open MERGEN settings to activate Telegram alerts, then come back here."
  );

  return NextResponse.json({ ok: true });
}
