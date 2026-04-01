import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getPhoneComparisonKey, isLikelyInternationalPhoneNumber } from "@/lib/phone-number";
import { requireAuthorizedProfile } from "@/lib/survey-authorization";
import {
  buildTelegramStartUrl,
  getTelegramActivationConfigurationError,
  getTelegramBotUsername,
  isTelegramActivationConfigured
} from "@/lib/telegram";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type TelegramSubscriptionRow = {
  user_id: string;
  phone_number: string;
  phone_number_normalized: string;
  telegram_username: string | null;
  notifications_enabled: boolean | null;
  linked_at: string | null;
  verified_at: string | null;
};

function buildLinkInstructions(phoneNumber: string) {
  return [
    "Telegram activation is ready.",
    `Open the bot, press Start, and share the same phone number you saved in MERGEN: ${phoneNumber}.`
  ].join(" ");
}

export async function GET() {
  const authorized = await requireAuthorizedProfile("community");

  if (authorized.response) {
    return authorized.response;
  }

  try {
    const admin = createAdminClient();
    const configurationError = getTelegramActivationConfigurationError();
    const { data, error } = await admin
      .from("telegram_notification_subscriptions")
      .select(
        "user_id,phone_number,phone_number_normalized,telegram_username,notifications_enabled,linked_at,verified_at"
      )
      .eq("user_id", authorized.profile.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const subscription = (data as TelegramSubscriptionRow | null) ?? null;
    const currentPhoneNumber = authorized.profile.phoneNumber.trim();
    const currentPhoneKey = getPhoneComparisonKey(currentPhoneNumber);
    const phoneReady = isLikelyInternationalPhoneNumber(currentPhoneNumber);
    const phoneMismatch = Boolean(
      subscription &&
        currentPhoneKey &&
        subscription.phone_number_normalized !== currentPhoneKey
    );
    const linked = Boolean(
      subscription?.notifications_enabled &&
        subscription?.verified_at &&
        currentPhoneKey &&
        !phoneMismatch
    );

    return NextResponse.json({
      linked,
      phoneNumber: currentPhoneNumber,
      phoneAvailable: Boolean(currentPhoneNumber),
      phoneReady,
      phoneMismatch,
      botConfigured: isTelegramActivationConfigured(),
      botConfigurationError: configurationError || null,
      botUsername: getTelegramBotUsername() || null,
      notificationsEnabled: Boolean(subscription?.notifications_enabled),
      telegramUsername: linked ? subscription?.telegram_username ?? null : null,
      linkedAt: linked
        ? subscription?.verified_at ?? subscription?.linked_at ?? null
        : null
    });
  } catch (error) {
    console.error("Telegram status lookup failed.", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load Telegram notification status."
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  const authorized = await requireAuthorizedProfile("community");

  if (authorized.response) {
    return authorized.response;
  }

  const phoneNumber = authorized.profile.phoneNumber.trim();

  if (!phoneNumber) {
    return NextResponse.json(
      {
        error: "Add your phone number first, then activate Telegram notifications."
      },
      { status: 400 }
    );
  }

  if (!isLikelyInternationalPhoneNumber(phoneNumber)) {
    return NextResponse.json(
      {
        error:
          "Use your phone in international format, like +994501234567, before activating Telegram."
      },
      { status: 400 }
    );
  }

  const configurationError = getTelegramActivationConfigurationError();

  if (!isTelegramActivationConfigured()) {
    return NextResponse.json(
      {
        error:
          configurationError ||
          "Telegram activation is not available on this deployment yet."
      },
      { status: 500 }
    );
  }

  const admin = createAdminClient();
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  try {
    await admin
      .from("telegram_link_tokens")
      .delete()
      .eq("user_id", authorized.profile.id)
      .is("consumed_at", null);

    const { error } = await admin.from("telegram_link_tokens").insert({
      token,
      user_id: authorized.profile.id,
      phone_number: phoneNumber,
      phone_number_normalized: getPhoneComparisonKey(phoneNumber),
      expires_at: expiresAt
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      botUrl: buildTelegramStartUrl(token),
      botUsername: getTelegramBotUsername(),
      expiresAt,
      instructions: buildLinkInstructions(phoneNumber)
    });
  } catch (error) {
    console.error("Telegram activation request failed.", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create Telegram activation link."
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const authorized = await requireAuthorizedProfile("community");

  if (authorized.response) {
    return authorized.response;
  }

  try {
    const admin = createAdminClient();

    await Promise.all([
      admin
        .from("telegram_notification_subscriptions")
        .delete()
        .eq("user_id", authorized.profile.id),
      admin
        .from("telegram_link_tokens")
        .delete()
        .eq("user_id", authorized.profile.id)
        .is("consumed_at", null)
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram unlink failed.", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not disconnect Telegram notifications."
      },
      { status: 500 }
    );
  }
}
