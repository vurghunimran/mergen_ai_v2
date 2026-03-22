import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildAudienceCriteriaEntries, buildCommunityAudienceProfile, matchesSurveyAudience } from "@/lib/audience-matching";
import type { SurveyAudience } from "@/lib/dashboard-data";
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function isValidPayload(body: NotifyCommunityRequest): body is Required<NotifyCommunityRequest> {
  return Boolean(
    body.title?.trim() &&
      body.description?.trim() &&
      typeof body.targetResponses === "number" &&
      typeof body.questionCount === "number" &&
      body.audience
  );
}

function buildAudienceHtml(audience: SurveyAudience) {
  return buildAudienceCriteriaEntries(audience)
    .map(
      (entry) =>
        `<li style="margin: 0 0 8px;"><strong>${escapeHtml(entry.label)}:</strong> ${escapeHtml(entry.value)}</li>`
    )
    .join("");
}

function buildAudienceText(audience: SurveyAudience) {
  return buildAudienceCriteriaEntries(audience).map((entry) => `${entry.label}: ${entry.value}`).join("\n");
}

function buildDashboardUrl(request: Request) {
  return `${new URL(request.url).origin}/dashboard/community`;
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

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing RESEND_API_KEY or SUPABASE_SERVICE_ROLE_KEY configuration"
        },
        { status: 500 }
      );
    }

    const admin = createAdminClient();
    const resend = new Resend(resendApiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "MERGEN AI <onboarding@resend.dev>";

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

    const matchingRecipients = ((baseRows as CommunityBaseRow[] | null) ?? [])
      .map((baseRow) => {
        const communityRow = communityById.get(baseRow.id);

        if (!communityRow || !baseRow.email) {
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

        if (!matchesSurveyAudience(body.audience, memberProfile)) {
          return null;
        }

        return {
          email: baseRow.email,
          firstName: baseRow.first_name?.trim() || "there"
        };
      })
      .filter((recipient): recipient is { email: string; firstName: string } => recipient !== null);

    if (matchingRecipients.length === 0) {
      return NextResponse.json({
        success: true,
        matchedRecipients: 0,
        sentEmails: 0
      });
    }

    const dashboardUrl = buildDashboardUrl(request);
    const audienceHtml = buildAudienceHtml(body.audience);
    const audienceText = buildAudienceText(body.audience);
    let sentEmails = 0;

    for (const recipientChunk of chunkArray(matchingRecipients, 50)) {
      const batchResponse = await resend.batch.send(
        recipientChunk.map((recipient) => ({
          from: fromEmail,
          to: recipient.email,
          subject: `New survey available: ${body.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
              <p>Hello ${escapeHtml(recipient.firstName)},</p>
              <p>
                A new survey matching your MERGEN AI profile is now available.
              </p>
              <div style="margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; background: #f9fafb;">
                <h1 style="font-size: 22px; margin: 0 0 12px;">${escapeHtml(body.title)}</h1>
                <p style="margin: 0 0 16px;">${escapeHtml(body.description)}</p>
                <p style="margin: 0 0 16px;"><strong>Questions:</strong> ${body.questionCount} | <strong>Target responses:</strong> ${body.targetResponses}</p>
                <p style="margin: 0 0 8px; font-weight: 700;">Audience criteria</p>
                <ul style="padding-left: 18px; margin: 0;">
                  ${audienceHtml}
                </ul>
              </div>
              <p>
                Open your dashboard to review available surveys:
                <a href="${dashboardUrl}" style="color: #ea580c; font-weight: 700;">${dashboardUrl}</a>
              </p>
            </div>
          `,
          text: [
            `Hello ${recipient.firstName},`,
            "",
            "A new survey matching your MERGEN AI profile is now available.",
            "",
            body.title,
            body.description,
            `Questions: ${body.questionCount}`,
            `Target responses: ${body.targetResponses}`,
            "",
            "Audience criteria",
            audienceText,
            "",
            `Open your dashboard: ${dashboardUrl}`
          ].join("\n")
        }))
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
