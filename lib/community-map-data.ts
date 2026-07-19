import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type CommunityMapData = {
  memberDistribution: Record<string, number>;
  totalCountries: number;
  totalMembers: number;
  maxMembers: number;
};

type CommunityCountryRow = {
  country: string | null;
};

const mapCountryAliases: Record<string, string> = {
  "bosniaandherzegovina": "Bosnia and Herz.",
  "centralafricanrepublic": "Central African Rep.",
  "cotedivoire": "C\u00f4te d'Ivoire",
  "czechrepublic": "Czechia",
  "democraticrepublicofthecongo": "Dem. Rep. Congo",
  "dominicanrepublic": "Dominican Rep.",
  "equatorialguinea": "Eq. Guinea",
  "eswatini": "eSwatini",
  "northmacedonia": "Macedonia",
  "solomonislands": "Solomon Is.",
  "southsudan": "S. Sudan",
  "unitedstates": "United States of America"
};

function normalizeCountryKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function mapCountryName(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  return mapCountryAliases[normalizeCountryKey(trimmedValue)] ?? trimmedValue;
}

export async function getCommunityMapData(): Promise<CommunityMapData> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("community_profiles").select("country");

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as CommunityCountryRow[];
    const memberDistribution: Record<string, number> = {};
    const distinctCountries = new Set<string>();

    for (const row of rows) {
      const country = row.country?.trim();
      if (!country) continue;

      distinctCountries.add(normalizeCountryKey(country));

      const mappedCountry = mapCountryName(country);
      if (!mappedCountry) continue;

      memberDistribution[mappedCountry] = (memberDistribution[mappedCountry] ?? 0) + 1;
    }

    const maxMembers = Math.max(1, ...Object.values(memberDistribution));

    return {
      memberDistribution,
      totalCountries: distinctCountries.size,
      totalMembers: rows.length,
      maxMembers
    };
  } catch (error) {
    console.error("Failed to load community map data.", error);

    return {
      memberDistribution: {},
      totalCountries: 0,
      totalMembers: 0,
      maxMembers: 1
    };
  }
}
