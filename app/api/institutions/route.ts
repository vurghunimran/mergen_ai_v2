import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type InstitutionCategory = "university" | "institution";

const MAX_RESULTS = 250;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() as InstitutionCategory;
  const query = searchParams.get("q")?.trim() ?? "";

  if (!country || !["university", "institution"].includes(category)) {
    return NextResponse.json(
      { institutions: [], message: "Country and affiliation type are required." },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();
    let directoryQuery = admin
      .from("institutions")
      .select("id,name,organization_types")
      .eq("category", category)
      .eq("active", true)
      .order("name", { ascending: true })
      .limit(MAX_RESULTS);

    if (country !== "International") {
      directoryQuery = directoryQuery.eq("country_name", country);
    }

    if (query.length >= 2) {
      directoryQuery = directoryQuery.ilike("name", `%${query}%`);
    }

    const { data, error } = await directoryQuery;

    if (error) {
      throw error;
    }

    return NextResponse.json({ institutions: data ?? [] });
  } catch (error) {
    console.error("Institution directory lookup failed.", error);
    return NextResponse.json(
      {
        institutions: [],
        message: "The institution directory is temporarily unavailable.",
      },
      { status: 503 },
    );
  }
}
