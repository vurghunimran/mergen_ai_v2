import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/email/config";
import { dispatchSurveyLaunchStage } from "@/lib/survey-distribution";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthorizedProfile } from "@/lib/survey-authorization";
import type { SurveyRow } from "@/lib/survey-db";

type NotifyCommunityRequest = {
  surveyId?: number;
};

function parseSurveyId(body: NotifyCommunityRequest) {
  return typeof body.surveyId === "number" && Number.isInteger(body.surveyId) && body.surveyId > 0
    ? body.surveyId
    : null;
}

export async function POST(request: Request) {
  try {
    const authorized = await requireAuthorizedProfile("client");

    if (authorized.response) {
      return authorized.response;
    }

    const requestBody =
      ((await request.json().catch(() => null)) as NotifyCommunityRequest | null) ?? {};
    const surveyId = parseSurveyId(requestBody);

    if (!surveyId) {
      return NextResponse.json({ success: false, error: "Invalid survey notification payload" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("surveys")
      .select("*")
      .eq("id", surveyId)
      .eq("user_id", authorized.profile.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "Survey not found." }, { status: 404 });
    }

    const result = await dispatchSurveyLaunchStage({
      admin,
      survey: data as SurveyRow,
      appBaseUrl: getAppBaseUrl(request)
    });

    return NextResponse.json({
      success: true,
      stage: result.stage,
      matchedRecipients: result.matchedRecipients,
      sentEmails: result.sentEmails,
      sentTelegramMessages: result.sentTelegramMessages,
      remainingResponses: result.remainingResponses
    });
  } catch (error) {
    console.error("Community notification send failed.", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to send survey notifications"
      },
      { status: 500 }
    );
  }
}
