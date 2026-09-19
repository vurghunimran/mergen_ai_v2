import { NextResponse } from "next/server";
import {
  getRewardById,
  mapRewardActivationRow,
  type RewardActivationRow
} from "@/lib/reward-activations";
import { requireAuthorizedProfile } from "@/lib/survey-authorization";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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
  if (authorized.response) return authorized.response;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.rewardId !== "string" || !getRewardById(body.rewardId) ||
      typeof body.idempotencyKey !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.idempotencyKey)) {
    return NextResponse.json({ error: "Invalid reward request." }, { status: 400 });
  }
  try {
    const { data, error } = await createAdminClient().rpc("redeem_reward", {
      p_member: authorized.profile.id, p_reward: body.rewardId, p_request: body.idempotencyKey
    });
    if (error) return NextResponse.json({ error: error.code === "23514" ? "Insufficient credits or reward unavailable." : "Could not process reward request." }, { status: ["23514", "23505"].includes(error.code) ? 409 : 503 });
    return NextResponse.json({ activation: mapRewardActivationRow(data.activation), remainingCredits: data.remainingCredits,
      message: "Your reward request is recorded and awaiting fulfillment." });
  } catch {
    return NextResponse.json({ error: "Could not process reward request." }, { status: 503 });
  }
}
