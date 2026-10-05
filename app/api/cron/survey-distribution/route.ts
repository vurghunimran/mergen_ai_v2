import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/email/config";
import { runSurveyDistributionCycle } from "@/lib/survey-distribution";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  return Boolean(cronSecret) && request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized cron request." }, { status: 401 });
  }

  const startedAt = Date.now();
  const dryRun = new URL(request.url).searchParams.get("dry_run") === "1";

  try {
    const admin = createAdminClient();
    const summary = await runSurveyDistributionCycle({
      admin,
      appBaseUrl: getAppBaseUrl(request),
      dryRun
    });

    console.info("Survey distribution cycle completed.", {
      dryRun,
      processedSurveys: summary.processedSurveys,
      archivedSurveys: summary.archivedSurveys,
      processedStages: summary.processedStageRuns.length,
      durationMs: Date.now() - startedAt
    });

    return NextResponse.json({
      success: true,
      ...summary
    });
  } catch (error) {
    console.error("Survey distribution cron failed.", {
      dryRun,
      durationMs: Date.now() - startedAt,
      errorType: error instanceof Error ? error.name : "UnknownError"
    });

    return NextResponse.json(
      {
        success: false,
        error: "Survey distribution cron failed."
      },
      { status: 500 }
    );
  }
}
