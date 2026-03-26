import { NextResponse } from "next/server";
import {
  buildCommunityAudienceProfile,
  prioritizeAudienceCandidates
} from "@/lib/audience-matching";
import type { SurveyAudience } from "@/lib/dashboard-data";
import { buildSurveyLaunchEmail } from "@/lib/email/templates";
import {
  createResendClient,
  getAppBaseUrl,
  getResendFromEmail,
  isValidEmail
} from "@/lib/email/config";
import { getCurrentUserProfile } from "@/lib/supabase/profile-server";
import { createAdminClient } from "@/lib/supabase/admin";

type NotifyCommunityRequest = {
  title?: string;
  description?: string;
  targetResponses?: number;
  questionCount?: number;
  audience?: SurveyAudience;
};

type CommunityBaseRow = {
  id: string;
  email: string | null;
  first_name: string | null;
};

type CommunityProfileRow = {
  id: string;
  country: string | null;
  age_span: string | null;
  gender: string | null;
  educational_level: string | null;
  interests: string[] | null;
  salary_range: string | null;
  place_of_residence: string | null;
  family_status: string | null;
};

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function isValidPayload(body: NotifyCommunityRequest): body is Required<NotifyCommunityRequest> {
  const targetResponses = body.targetResponses;
  const questionCount = body.questionCount;

  return Boolean(
    body.title?.trim() &&
      body.description?.trim() &&
      typeof targetResponses === "number" &&
      Number.isFinite(targetResponses) &&
      targetResponses > 0 &&
      typeof questionCount === "number" &&
      Number.isFinite(questionCount) &&
      questionCount > 0 &&
      body.audience
  );
}

export async function POST(request: Request) {
  try {
    const authenticatedProfile = await getCurrentUserProfile();

    if (!authenticatedProfile) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (authenticatedProfile.profile.role !== "client") {
      return NextResponse.json({ success: false, error: "Only client accounts can publish surveys" }, { status: 403 });
    }

    const body = (await request.json()) as NotifyCommunityRequest;

    if (!isValidPayload(body)) {
      return NextResponse.json({ success: false, error: "Invalid survey notification payload" }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing SUPABASE_SERVICE_ROLE_KEY configuration"
        },
        { status: 500 }
      );
    }

    const admin = createAdminClient();
    const resend = createResendClient();
    const fromEmail = getResendFromEmail("MERGEN AI <onboarding@resend.dev>");

    const [{ data: baseRows, error: baseError }, { data: communityRows, error: communityError }] = await Promise.all([
      admin.from("profiles").select("id,email,first_name").eq("role", "community"),
      admin
        .from("community_profiles")
        .select("id,country,age_span,gender,educational_level,interests,salary_range,place_of_residence,family_status")
    ]);

    if (baseError) {
      throw baseError;
    }

    if (communityError) {
      throw communityError;
    }

    const communityById = new Map(
      ((communityRows as CommunityProfileRow[] | null) ?? []).map((row) => [row.id, row])
    );

    const candidateRecipients = ((baseRows as CommunityBaseRow[] | null) ?? [])
      .map((baseRow) => {
        const communityRow = communityById.get(baseRow.id);
        const normalizedEmail = baseRow.email?.trim().toLowerCase() ?? "";

        if (!communityRow || !normalizedEmail || !isValidEmail(normalizedEmail)) {
          return null;
        }

        const memberProfile = buildCommunityAudienceProfile({
          ageSpan: communityRow.age_span,
          country: communityRow.country,
          gender: communityRow.gender,
          education: communityRow.educational_level,
          interests: communityRow.interests,
          salaryRange: communityRow.salary_range,
          residence: communityRow.place_of_residence,
          familyStatus: communityRow.family_status
        });

        return {
          email: normalizedEmail,
          firstName: baseRow.first_name?.trim() || "there",
          memberProfile
        };
      })
      .filter(
        (
          recipient
        ): recipient is {
          email: string;
          firstName: string;
          memberProfile: ReturnType<typeof buildCommunityAudienceProfile>;
        } => recipient !== null
      );

    const matchingRecipientsByEmail = new Map<string, { email: string; firstName: string }>();

    for (const { email, firstName } of prioritizeAudienceCandidates(
      body.audience,
      candidateRecipients,
      (candidate) => candidate.memberProfile,
      body.targetResponses
    )) {
      if (!matchingRecipientsByEmail.has(email)) {
        matchingRecipientsByEmail.set(email, {
          email,
          firstName
        });
      }
    }

    const matchingRecipients = [...matchingRecipientsByEmail.values()];

    if (matchingRecipients.length === 0) {
      return NextResponse.json({
        success: true,
        matchedRecipients: 0,
        sentEmails: 0
      });
    }

    const dashboardUrl = `${getAppBaseUrl(request)}/dashboard/community`;
    let sentEmails = 0;

    for (const recipientChunk of chunkArray(matchingRecipients, 50)) {
      const batchResponse = await resend.batch.send(
        recipientChunk.map((recipient) => {
          const emailContent = buildSurveyLaunchEmail({
            firstName: recipient.firstName,
            title: body.title,
            description: body.description,
            questionCount: body.questionCount,
            targetResponses: body.targetResponses,
            dashboardUrl
          });

          return {
            from: fromEmail,
            to: recipient.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            tags: [{ name: "flow", value: "survey-launch" }]
          };
        })
      );

      if (batchResponse.error) {
        throw new Error(batchResponse.error.message);
      }

      sentEmails += batchResponse.data.data.length;
    }

    return NextResponse.json({
      success: true,
      matchedRecipients: matchingRecipients.length,
      sentEmails
    });
  } catch (error) {
    console.error("Community notification send failed.", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to send survey notifications";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
