import { NextResponse } from "next/server";
import {
  getCommunityLaunchRegionByCountry,
  normalizeCommunityLaunchCountry
} from "@/lib/community-distribution";
import { getDetectedCountryFromHeaders } from "@/lib/request-country";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function isRegionAvailable(country: string) {
  const region = getCommunityLaunchRegionByCountry(country);

  if (!region) {
    return false;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return true;
  }

  const admin = createAdminClient();
  const { count, error } = await admin
    .from("community_profiles")
    .select("id", { count: "exact", head: true })
    .in("country", [...region.countries]);

  if (error) {
    throw error;
  }

  return (count ?? 0) < region.targetMembers;
}

export async function GET(request: Request) {
  try {
    const detectedCountry = getDetectedCountryFromHeaders(request.headers);

    if (!detectedCountry) {
      return NextResponse.json({
        allowed: false,
        detectedCountry: null,
        verifiedCountry: null,
        message: "We couldn't verify your location. Turn off VPN or proxy and try again."
      });
    }

    const verifiedCountry = normalizeCommunityLaunchCountry(detectedCountry);

    if (!verifiedCountry) {
      return NextResponse.json({
        allowed: false,
        detectedCountry,
        verifiedCountry: null,
        message: "Community sign-up isn't available for your current location."
      });
    }

    if (!(await isRegionAvailable(verifiedCountry))) {
      return NextResponse.json({
        allowed: false,
        detectedCountry: verifiedCountry,
        verifiedCountry: null,
        message: "Community sign-up isn't available for your current location right now."
      });
    }

    return NextResponse.json({
      allowed: true,
      detectedCountry: verifiedCountry,
      verifiedCountry,
      message: ""
    });
  } catch (error) {
    console.error("Community signup eligibility check failed.", error);

    return NextResponse.json(
      {
        allowed: false,
        detectedCountry: null,
        verifiedCountry: null,
        message: "We couldn't verify your location right now. Please try again."
      },
      { status: 500 }
    );
  }
}
