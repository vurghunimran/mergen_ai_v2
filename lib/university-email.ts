export const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UNIVERSITY_DOMAIN_PATTERN =
  /(?:\.edu$)|(?:\.(?:edu|ac)\.[a-z]{2,}(?:\.[a-z]{2,})?$)/i;

export type UniversityDirectoryRecord = {
  name?: string;
  domains?: string[];
};

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmailAddress(value: string) {
  return EMAIL_ADDRESS_PATTERN.test(normalizeEmail(value));
}

export function extractEmailDomain(email: string) {
  const [, domain = ""] = normalizeEmail(email).split("@");
  return domain;
}

export function normalizeInstitutionName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findUniversityDirectoryMatch(
  records: UniversityDirectoryRecord[],
  institution: string,
) {
  const normalizedInstitution = normalizeInstitutionName(institution);

  if (!normalizedInstitution) {
    return null;
  }

  const exactMatch =
    records.find(
      (record) =>
        normalizeInstitutionName(record.name ?? "") === normalizedInstitution,
    ) ?? null;

  if (exactMatch) {
    return exactMatch;
  }

  return (
    records.find((record) => {
      const normalizedRecordName = normalizeInstitutionName(record.name ?? "");

      return (
        normalizedRecordName.includes(normalizedInstitution) ||
        normalizedInstitution.includes(normalizedRecordName)
      );
    }) ?? null
  );
}

export function matchesUniversityEmailDomain(
  emailDomain: string,
  allowedDomain: string,
) {
  const normalizedEmailDomain = emailDomain.trim().toLowerCase();
  const normalizedAllowedDomain = allowedDomain
    .trim()
    .toLowerCase()
    .replace(/^\.+/, "");

  if (!normalizedEmailDomain || !normalizedAllowedDomain) {
    return false;
  }

  return (
    normalizedEmailDomain === normalizedAllowedDomain ||
    normalizedEmailDomain.endsWith(`.${normalizedAllowedDomain}`)
  );
}

export function isLikelyUniversityEmailDomain(domain: string) {
  return UNIVERSITY_DOMAIN_PATTERN.test(domain.trim().toLowerCase());
}

export function formatUniversityDomains(domains: string[]) {
  return domains
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 3)
    .map((domain) => `@${domain}`)
    .join(", ");
}
