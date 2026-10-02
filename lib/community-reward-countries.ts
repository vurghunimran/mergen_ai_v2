import { communityLaunchCountries, normalizeCommunityLaunchCountry } from "@/lib/community-distribution";

// ISO 3166-1 alpha-2 codes used by Tremendous's country-filtered product API.
type CommunityCountry = (typeof communityLaunchCountries)[number];

const countryCodes = {
  "United States": "US", Canada: "CA", Brazil: "BR", Mexico: "MX", Argentina: "AR",
  Chile: "CL", Uruguay: "UY", Colombia: "CO", "United Kingdom": "GB", Germany: "DE",
  France: "FR", Netherlands: "NL", Belgium: "BE", Poland: "PL", "Czech Republic": "CZ",
  Hungary: "HU", Romania: "RO", Slovenia: "SI", Serbia: "RS", Ukraine: "UA",
  Sweden: "SE", Norway: "NO", Denmark: "DK", Finland: "FI", Turkey: "TR",
  Azerbaijan: "AZ", Georgia: "GE", Armenia: "AM", "Saudi Arabia": "SA",
  "United Arab Emirates": "AE", Israel: "IL", Jordan: "JO", Lebanon: "LB",
  Iraq: "IQ", Iran: "IR", Kazakhstan: "KZ", Uzbekistan: "UZ",
  Kyrgyzstan: "KG", India: "IN", Pakistan: "PK", Bangladesh: "BD",
  Indonesia: "ID", Malaysia: "MY", Singapore: "SG", Thailand: "TH",
  Vietnam: "VN", Philippines: "PH", Japan: "JP", "South Korea": "KR",
  Taiwan: "TW", "Hong Kong": "HK", Australia: "AU", "New Zealand": "NZ",
  Egypt: "EG", Morocco: "MA", Algeria: "DZ", Nigeria: "NG", Ghana: "GH",
  Senegal: "SN", Kenya: "KE", Tanzania: "TZ", Ethiopia: "ET"
} satisfies Record<CommunityCountry, string>;

export const communityRewardCountries = communityLaunchCountries.map((name) => ({
  name,
  code: countryCodes[name]
}));

export function getCommunityRewardCountry(value: string) {
  const name = normalizeCommunityLaunchCountry(value);
  if (!name) return null;
  const code = countryCodes[name as CommunityCountry];
  return code ? { name, code } : null;
}
