import { NextResponse } from "next/server";
import { isAdminIdentity } from "@/lib/admin-access";
import { communityRewardCountries } from "@/lib/community-reward-countries";
import { getCurrentUserProfile } from "@/lib/supabase/profile-server";
import { isTremendousSandboxConfigured, listTremendousSandboxProducts } from "@/lib/tremendous-sandbox";

export const dynamic = "force-dynamic";

const previewCountries = new Set(communityRewardCountries.map((country) => country.code));

export async function GET(request: Request) {
  const authenticated = await getCurrentUserProfile();
  if (!authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminIdentity(authenticated.user)) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const country = new URL(request.url).searchParams.get("country")?.toUpperCase() ?? "";
  if (!previewCountries.has(country)) return NextResponse.json({ error: "Choose a supported community country." }, { status: 400 });
  if (!isTremendousSandboxConfigured()) {
    return NextResponse.json({ country, products: [], setupRequired: true });
  }

  try {
    const products = (await listTremendousSandboxProducts(country)).filter(
      (product) => product.countries.includes(country)
    );
    return NextResponse.json({ country, products, setupRequired: false });
  } catch (error) {
    console.error("Tremendous sandbox catalog request failed.", error);
    return NextResponse.json({ error: "Could not load the Tremendous sandbox catalog." }, { status: 502 });
  }
}
