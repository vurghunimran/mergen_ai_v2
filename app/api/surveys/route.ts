import { NextResponse } from "next/server";
import type { SurveyCheckoutPayload } from "@/lib/dashboard-data";
import {
  getUnsupportedCommunityLaunchCountries,
  normalizeCommunityLaunchCountries
} from "@/lib/community-distribution";
import { buildSurveyInsertPayload, listClientSurveysForUser, mapSurveyRowToClientSurvey, type SurveyRow } from "@/lib/survey-db";
import { validateSurveyAttachmentsInput } from "@/lib/survey-attachments";
import { buildForbiddenSurveyResponse, requireAuthorizedProfile } from "@/lib/survey-authorization";
import { getSurveyStorageErrorMessage } from "@/lib/survey-storage-errors";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isMissingAttachmentsColumnError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = typeof (error as { code?: unknown }).code === "string" ? (error as { code: string }).code : "";
  const message =
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message.toLowerCase()
      : "";

  return code === "PGRST204" && message.includes("attachments") && message.includes("schema cache");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseCreateSurveyPayload(body: unknown): {
  payload: SurveyCheckoutPayload | null;
  error?: string;
} {
  if (!isObject(body)) {
    return {
      payload: null,
      error: "Invalid survey payload."
    };
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const researchDescription = typeof body.researchDescription === "string" ? body.researchDescription.trim() : "";
  const researchScope = typeof body.researchScope === "string" ? body.researchScope.trim() : "";
  const hypothesis = typeof body.hypothesis === "string" ? body.hypothesis.trim() : "";
  const targetResponses = typeof body.targetResponses === "number" ? body.targetResponses : 0;
  const questionCount = typeof body.questionCount === "number" ? body.questionCount : 0;
  const audience = isObject(body.audience) ? body.audience : null;
  const questions = Array.isArray(body.questions) ? body.questions : null;
  const { attachments, error: attachmentError } = validateSurveyAttachmentsInput(body.attachments);

  if (attachmentError) {
    return {
      payload: null,
      error: attachmentError
    };
  }

  if (!title || !description || !researchDescription || targetResponses <= 0 || questionCount <= 0 || !audience || !questions) {
    return {
      payload: null,
      error: "Invalid survey payload."
    };
  }

  return {
    payload: {
      title,
      targetResponses,
      questionCount,
      description,
      researchDescription,
      researchScope,
      hypothesis,
      audience: audience as SurveyCheckoutPayload["audience"],
      questions: questions as SurveyCheckoutPayload["questions"],
      includeDetailedAI: Boolean(body.includeDetailedAI),
      attachments
    }
  };
}

export async function GET() {
  const authorized = await requireAuthorizedProfile("client");

  if (authorized.response) {
    return authorized.response;
  }

  try {
    const supabase = createClient();
    const surveys = await listClientSurveysForUser(supabase, authorized.profile.id);
    return NextResponse.json({ surveys });
  } catch (error) {
    console.error("Failed to load client surveys.", error);
    return NextResponse.json({ error: getSurveyStorageErrorMessage(error) ?? "Could not load surveys." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorized = await requireAuthorizedProfile("client");

  if (authorized.response) {
    return authorized.response;
  }

  const { payload, error: payloadError } = parseCreateSurveyPayload(await request.json().catch(() => null));

  if (!payload) {
    return NextResponse.json({ error: payloadError ?? "Invalid survey payload." }, { status: 400 });
  }

  const unsupportedCountries = getUnsupportedCommunityLaunchCountries(payload.audience.countries);

  if (unsupportedCountries.length > 0) {
    return NextResponse.json(
      {
        error: `Survey audience countries must stay within the first-stage community rollout. Unsupported: ${unsupportedCountries.join(", ")}.`
      },
      { status: 400 }
    );
  }

  payload.audience.countries = normalizeCommunityLaunchCountries(payload.audience.countries);

  try {
    const supabase = createClient();
    const insertPayload = buildSurveyInsertPayload(payload, authorized.profile.id);
    let warning = "";
    let { data, error } = await supabase
      .from("surveys")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error && isMissingAttachmentsColumnError(error)) {
      const { attachments: _attachments, ...fallbackInsertPayload } = insertPayload;
      const fallbackResult = await supabase
        .from("surveys")
        .insert(fallbackInsertPayload)
        .select("*")
        .single();

      data = fallbackResult.data;
      error = fallbackResult.error;
      warning =
        "Survey published without attachments because the database attachment column is not available yet. Run the latest survey attachment migration in Supabase to enable uploads.";
    }

    if (error || !data) {
      throw error ?? new Error("Survey could not be created.");
    }

    return NextResponse.json({
      survey: mapSurveyRowToClientSurvey(data as SurveyRow),
      warning
    });
  } catch (error) {
    console.error("Failed to create survey.", error);
    const storageErrorMessage = getSurveyStorageErrorMessage(error);

    if (error instanceof Error && error.message.toLowerCase().includes("permission")) {
      return buildForbiddenSurveyResponse();
    }

    return NextResponse.json({ error: storageErrorMessage ?? "Could not create survey." }, { status: 500 });
  }
}
