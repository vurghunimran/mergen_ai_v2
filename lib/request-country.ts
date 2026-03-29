type HeaderReader = {
  get(name: string): string | null;
};

const countryHeaderNames = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "cloudfront-viewer-country",
  "x-country-code",
  "x-appengine-country"
];

const countryCodeNameOverrides: Record<string, string> = {
  AE: "United Arab Emirates",
  CZ: "Czech Republic",
  GB: "United Kingdom",
  HK: "Hong Kong",
  KR: "South Korea",
  TR: "Turkey",
  US: "United States"
};

function normalizeCountryCode(value: string) {
  const normalizedValue = value.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalizedValue)) {
    return null;
  }

  if (normalizedValue === "XX" || normalizedValue === "T1") {
    return null;
  }

  return normalizedValue;
}

function getCountryNameFromCode(code: string) {
  if (countryCodeNameOverrides[code]) {
    return countryCodeNameOverrides[code];
  }

  if (typeof Intl === "undefined" || typeof Intl.DisplayNames !== "function") {
    return null;
  }

  const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  const displayName = displayNames.of(code);

  if (!displayName || displayName === code || displayName === "Unknown Region") {
    return null;
  }

  return displayName;
}

export function getDetectedCountryFromHeaders(headers: HeaderReader) {
  for (const headerName of countryHeaderNames) {
    const headerValue = headers.get(headerName);

    if (!headerValue) {
      continue;
    }

    const normalizedCountryCode = normalizeCountryCode(headerValue);

    if (!normalizedCountryCode) {
      continue;
    }

    const countryName = getCountryNameFromCode(normalizedCountryCode);

    if (countryName) {
      return countryName;
    }
  }

  return null;
}
