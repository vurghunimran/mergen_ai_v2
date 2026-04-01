import { NextResponse } from "next/server";
import {
  getRewardById,
  mapRewardActivationRow,
  type RewardActivationRow
} from "@/lib/reward-activations";
import { requireAuthorizedProfile } from "@/lib/survey-authorization";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type CreateRewardActivationRequestBody = {
  rewardId?: string;
};

type RewardBalanceRow = {
  earned_credits: number;
};

type WelcomeRewardBalanceRow = {
  earned_credits: number;
};

type RewardSpendRow = {
  credits: number;
  status: "activated" | "fulfilled" | "cancelled";
};

function getRewardActivationStorageErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
        ? error.message
        : "";

  if (!message) {
    return "Could not load reward activations.";
  }

  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("reward_activations")) {
    return "Reward activation storage is not ready yet. Run the SQL in supabase/migrate-admin-reward-activations.sql.";
  }

  return message;
}

function isMissingRewardActivationsStorageError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
        ? error.message
        : "";

  const details =
    typeof error === "object" && error !== null && "details" in error && typeof error.details === "string"
      ? error.details
      : "";

  const combinedMessage = `${message} ${details}`.toLowerCase();

  return (
    combinedMessage.includes("reward_activations") &&
    (combinedMessage.includes("does not exist") || combinedMessage.includes("could not find"))
  );
}

export async function GET() {
  const authorized = await requireAuthorizedProfile("community");

  if (authorized.response) {
    return authorized.response;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("reward_activations")
      .select("id,member_id,reward_id,reward_company,reward_subtitle,activation_email,credits,status,activated_at")
      .eq("member_id", authorized.profile.id)
      .order("activated_at", { ascending: false });

    if (error) {
      if (isMissingRewardActivationsStorageError(error)) {
        return NextResponse.json({ activations: [] });
      }

      throw error;
    }

    return NextResponse.json({
      activations: ((data ?? []) as RewardActivationRow[]).map(mapRewardActivationRow)
    });
  } catch (error) {
    console.error("Failed to load reward activations.", error);
    return NextResponse.json(
      { error: getRewardActivationStorageErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authorized = await requireAuthorizedProfile("community");

  if (authorized.response) {
    return authorized.response;
  }

  const body = (await request.json().catch(() => null)) as CreateRewardActivationRequestBody | null;
  const reward = body?.rewardId ? getRewardById(body.rewardId) : null;

  if (!reward) {
    return NextResponse.json({ error: "Invalid reward selection." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const [earnedCreditsResult, welcomeCreditsResult, redeemedCreditsResult] = await Promise.all([
      admin
        .from("survey_responses")
        .select("earned_credits")
        .eq("respondent_id", authorized.profile.id),
      admin
        .from("welcome_survey_completions")
        .select("earned_credits")
        .eq("respondent_id", authorized.profile.id),
      admin.from("reward_activations").select("credits,status").eq("member_id", authorized.profile.id)
    ]);

    if (earnedCreditsResult.error) {
      throw earnedCreditsResult.error;
    }

    if (welcomeCreditsResult.error) {
      throw welcomeCreditsResult.error;
    }

    if (redeemedCreditsResult.error) {
      throw redeemedCreditsResult.error;
    }

    const totalEarnedCredits =
      ((earnedCreditsResult.data ?? []) as RewardBalanceRow[]).reduce(
        (sum, row) => sum + row.earned_credits,
        0
      ) +
      ((welcomeCreditsResult.data ?? []) as WelcomeRewardBalanceRow[]).reduce(
        (sum, row) => sum + row.earned_credits,
        0
      );
    const totalRedeemedCredits = ((redeemedCreditsResult.data ?? []) as RewardSpendRow[])
      .filter((row) => row.status !== "cancelled")
      .reduce((sum, row) => sum + row.credits, 0);
    const availableCredits = Math.max(0, totalEarnedCredits - totalRedeemedCredits);

    if (availableCredits < reward.credits) {
      return NextResponse.json(
        {
          error: `You need ${reward.credits} credits for ${reward.company}, but only ${availableCredits} are available.`
        },
        { status: 409 }
      );
    }

    const { data, error } = await admin
      .from("reward_activations")
      .insert({
        member_id: authorized.profile.id,
        reward_id: reward.id,
        reward_company: reward.company,
        reward_subtitle: reward.subtitle,
        activation_email: authorized.profile.email,
        credits: reward.credits
      })
      .select("id,member_id,reward_id,reward_company,reward_subtitle,activation_email,credits,status,activated_at")
      .single();

    if (error || !data) {
      throw error ?? new Error("Could not create reward activation.");
    }

    const message =
      reward.id === "withdraw-cash"
        ? `Cash withdrawal request has been sent to ${authorized.profile.email}.`
        : `${reward.company} reward has been sent to ${authorized.profile.email}.`;

    return NextResponse.json({
      activation: mapRewardActivationRow(data as RewardActivationRow),
      remainingCredits: availableCredits - reward.credits,
      message
    });
  } catch (error) {
    console.error("Failed to create reward activation.", error);
    return NextResponse.json(
      { error: getRewardActivationStorageErrorMessage(error) },
      { status: 500 }
    );
  }
}
