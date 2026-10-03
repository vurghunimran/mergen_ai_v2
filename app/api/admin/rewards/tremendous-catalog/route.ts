import { NextResponse } from "next/server";
import { isAdminIdentity } from "@/lib/admin-access";
import { communityRewardCountries } from "@/lib/community-reward-countries";
import { getCurrentUserProfile } from "@/lib/supabase/profile-server";
import { isTremendousConfigured, listTremendousProducts, tremendousMode } from "@/lib/tremendous";

export const dynamic = "force-dynamic";

const previewCountries = new Set(communityRewardCountries.map((country) => country.code));

export async function GET(request: Request) {
  const authenticated = await getCurrentUserProfile();
  if (!authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminIdentity(authenticated.user)) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const country = new URL(request.url).searchParams.get("country")?.toUpperCase() ?? "";
  if (!previewCountries.has(country)) return NextResponse.json({ error: "Choose a supported community country." }, { status: 400 });
  if (!isTremendousConfigured()) {
    return NextResponse.json({ mode: tremendousMode(), country, products: [], setupRequired: true }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const products = (await listTremendousProducts(country)).filter(
      (product) => product.countries.includes(country)
    );
    return NextResponse.json({ mode: tremendousMode(), country, products, setupRequired: false }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Tremendous catalog request failed.", error);
    return NextResponse.json({ error: "Could not load the Tremendous catalog." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
