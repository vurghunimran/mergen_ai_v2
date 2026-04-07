import { NextResponse } from "next/server";
import {
  communityLaunchCountries,
  getCommunityLaunchRegionByCountry,
  normalizeCommunityLaunchCountry
} from "@/lib/community-distribution";
import { getDetectedCountryFromHeaders } from "@/lib/request-country";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function getRequestedCountry(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedCountry = searchParams.get("country")?.trim() ?? "";

  if (!requestedCountry) {
    return null;
  }

  return normalizeCommunityLaunchCountry(requestedCountry);
}

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
    const requestedCountry = getRequestedCountry(request);
    const verifiedCountry =
      normalizeCommunityLaunchCountry(detectedCountry ?? "") ?? requestedCountry;

    if (!verifiedCountry) {
      return NextResponse.json({
        allowed: false,
        detectedCountry: requestedCountry,
        verifiedCountry: null,
        availableCountries: communityLaunchCountries,
        message:
          "We couldn't verify your location automatically. Choose your country manually and try again."
      });
    }

    if (!(await isRegionAvailable(verifiedCountry))) {
      return NextResponse.json({
        allowed: false,
        detectedCountry: verifiedCountry,
        verifiedCountry: null,
        availableCountries: communityLaunchCountries,
        message: "Community sign-up isn't available for your current location right now."
      });
    }

    return NextResponse.json({
      allowed: true,
      detectedCountry: verifiedCountry,
      verifiedCountry,
      availableCountries: communityLaunchCountries,
      message: ""
    });
  } catch (error) {
    console.error("Community signup eligibility check failed.", error);

    return NextResponse.json(
      {
        allowed: false,
        detectedCountry: null,
        verifiedCountry: null,
        availableCountries: communityLaunchCountries,
        message: "We couldn't verify your location right now. Please try again."
      },
      { status: 500 }
    );
  }
}
