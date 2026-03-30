import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/email/config";
import { runSurveyDistributionCycle } from "@/lib/survey-distribution";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized cron request." }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const summary = await runSurveyDistributionCycle({
      admin,
      appBaseUrl: getAppBaseUrl(request)
    });

    return NextResponse.json({
      success: true,
      ...summary
    });
  } catch (error) {
    console.error("Survey distribution cron failed.", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Survey distribution cron failed."
      },
      { status: 500 }
    );
  }
}
