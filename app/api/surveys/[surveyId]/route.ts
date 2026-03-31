import { NextResponse } from "next/server";
import { getClientSurveyForUser } from "@/lib/survey-db";
import { buildForbiddenSurveyResponse, requireAuthorizedProfile } from "@/lib/survey-authorization";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    surveyId: string;
  };
};

function parseSurveyId(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(_request: Request, context: RouteContext) {
  const authorized = await requireAuthorizedProfile("client");

  if (authorized.response) {
    return authorized.response;
  }

  const surveyId = parseSurveyId(context.params.surveyId);

  if (!surveyId) {
    return NextResponse.json({ error: "Invalid survey id." }, { status: 400 });
  }

  try {
    const supabase = createClient();
    const survey = await getClientSurveyForUser(supabase, surveyId, authorized.profile.id);

    if (!survey) {
      return buildForbiddenSurveyResponse();
    }

    return NextResponse.json({ survey });
  } catch (error) {
    console.error("Failed to load survey.", error);
    return NextResponse.json({ error: "Could not load survey." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authorized = await requireAuthorizedProfile("client");

  if (authorized.response) {
    return authorized.response;
  }

  const surveyId = parseSurveyId(context.params.surveyId);

  if (!surveyId) {
    return NextResponse.json({ error: "Invalid survey id." }, { status: 400 });
  }

  try {
    const supabase = createClient();
    const survey = await getClientSurveyForUser(supabase, surveyId, authorized.profile.id);

    if (!survey) {
      return buildForbiddenSurveyResponse();
    }

    const { error } = await supabase
      .from("surveys")
      .update({
        status: "archived",
        days_remaining: 0,
        distribution_completed_at: new Date().toISOString()
      })
      .eq("id", surveyId)
      .eq("user_id", authorized.profile.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, archived: true });
  } catch (error) {
    console.error("Failed to archive survey.", error);
    return NextResponse.json({ error: "Could not archive survey." }, { status: 500 });
  }
}
