const normalizeCountryKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

export const communityLaunchTotalMembers = 10000;

export const communityLaunchRegions = [
  {
    id: "north_america",
    label: "North America",
    targetMembers: 1500,
    countries: ["United States", "Canada"]
  },
  {
    id: "latin_america",
    label: "Latin America",
    targetMembers: 1000,
    countries: ["Brazil", "Mexico", "Argentina", "Chile", "Uruguay", "Colombia"]
  },
  {
    id: "western_europe",
    label: "Western Europe",
    targetMembers: 1000,
    countries: ["United Kingdom", "Germany", "France", "Netherlands", "Belgium"]
  },
  {
    id: "eastern_europe",
    label: "Eastern Europe",
    targetMembers: 900,
    countries: ["Poland", "Czech Republic", "Hungary", "Romania", "Slovenia", "Serbia", "Ukraine"]
  },
  {
    id: "northern_europe",
    label: "Northern Europe",
    targetMembers: 500,
    countries: ["Sweden", "Norway", "Denmark", "Finland"]
  },
  {
    id: "western_asia",
    label: "Western Asia",
    targetMembers: 700,
    countries: [
      "Turkey",
      "Azerbaijan",
      "Georgia",
      "Armenia",
      "Saudi Arabia",
      "United Arab Emirates",
      "Israel",
      "Jordan",
      "Lebanon",
      "Iraq",
      "Iran"
    ]
  },
  {
    id: "central_asia",
    label: "Central Asia",
    targetMembers: 300,
    countries: ["Kazakhstan", "Uzbekistan", "Kyrgyzstan"]
  },
  {
    id: "south_asia",
    label: "South Asia",
    targetMembers: 1200,
    countries: ["India", "Pakistan", "Bangladesh"]
  },
  {
    id: "southeast_asia",
    label: "Southeast Asia",
    targetMembers: 1000,
    countries: ["Indonesia", "Malaysia", "Singapore", "Thailand", "Vietnam", "Philippines"]
  },
  {
    id: "eastern_asia",
    label: "Eastern Asia",
    targetMembers: 800,
    countries: ["Japan", "South Korea", "Taiwan", "Hong Kong"]
  },
  {
    id: "oceania",
    label: "Oceania",
    targetMembers: 400,
    countries: ["Australia", "New Zealand"]
  },
  {
    id: "north_africa",
    label: "North Africa",
    targetMembers: 300,
    countries: ["Egypt", "Morocco", "Algeria"]
  },
  {
    id: "west_africa",
    label: "West Africa",
    targetMembers: 200,
    countries: ["Nigeria", "Ghana", "Senegal"]
  },
  {
    id: "east_africa",
    label: "East Africa",
    targetMembers: 200,
    countries: ["Kenya", "Tanzania", "Ethiopia"]
  }
] as const;

export type CommunityLaunchRegion = (typeof communityLaunchRegions)[number]["label"];

const communityCountryAliases: Record<string, string> = {
  "czechia": "Czech Republic",
  "greatbritain": "United Kingdom",
  "hongkongsar": "Hong Kong",
  "hongkongsarchina": "Hong Kong",
  "korearepublic": "South Korea",
  "republicofkorea": "South Korea",
  "turkiye": "Turkey",
  "uae": "United Arab Emirates",
  "uk": "United Kingdom",
  "unitedstatesofamerica": "United States",
  "usa": "United States"
};

const communityLaunchCountryLookup = new Map<string, string>();
const communityLaunchRegionByCountry = new Map<
  string,
  (typeof communityLaunchRegions)[number]
>();

for (const region of communityLaunchRegions) {
  for (const country of region.countries) {
    const normalizedCountry = normalizeCountryKey(country);
    communityLaunchCountryLookup.set(normalizedCountry, country);
    communityLaunchRegionByCountry.set(country, region);
  }
}

for (const [alias, canonicalCountry] of Object.entries(communityCountryAliases)) {
  communityLaunchCountryLookup.set(normalizeCountryKey(alias), canonicalCountry);
}

export const communityLaunchCountries = communityLaunchRegions.flatMap((region) => [...region.countries]);

export const communityLaunchRegionLabels = communityLaunchRegions.map(
  (region) => region.label
) as CommunityLaunchRegion[];

export function normalizeCommunityLaunchCountry(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return communityLaunchCountryLookup.get(normalizeCountryKey(trimmedValue)) ?? null;
}

export function isCommunityLaunchCountry(value: string) {
  return normalizeCommunityLaunchCountry(value) !== null;
}

export function getCommunityLaunchRegionByCountry(value: string) {
  const normalizedCountry = normalizeCommunityLaunchCountry(value);

  if (!normalizedCountry) {
    return null;
  }

  return communityLaunchRegionByCountry.get(normalizedCountry) ?? null;
}

export function normalizeCommunityLaunchCountries(countries: string[]) {
  return Array.from(
    new Set(
      countries
        .map((country) => normalizeCommunityLaunchCountry(country))
        .filter((country): country is string => Boolean(country))
    )
  );
}

export function getUnsupportedCommunityLaunchCountries(countries: string[]) {
  return countries.filter((country) => !normalizeCommunityLaunchCountry(country));
}

export function areCommunityCountriesEquivalent(left: string, right: string) {
  const normalizedLeft = normalizeCommunityLaunchCountry(left) ?? left.trim();
  const normalizedRight = normalizeCommunityLaunchCountry(right) ?? right.trim();
  return normalizeCountryKey(normalizedLeft) === normalizeCountryKey(normalizedRight);
}
