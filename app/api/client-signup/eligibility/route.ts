import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin-access";
import {
  extractEmailDomain,
  findUniversityDirectoryMatch,
  formatUniversityDomains,
  isLikelyUniversityEmailDomain,
  isValidEmailAddress,
  matchesUniversityEmailDomain,
  normalizeEmail,
  type UniversityDirectoryRecord,
} from "@/lib/university-email";

type ClientSignupEligibilityRequest = {
  email?: string;
  country?: string;
  institution?: string;
};

const GENERIC_UNIVERSITY_EMAIL_MESSAGE =
  "Use the email address issued by your university. Personal email providers are not accepted for client accounts.";

function buildInstitutionMismatchMessage(
  institution: string,
  matchedDomains: string[],
) {
  const normalizedInstitution = institution.trim();
  const domainHint = formatUniversityDomains(matchedDomains);

  if (!normalizedInstitution) {
    return GENERIC_UNIVERSITY_EMAIL_MESSAGE;
  }

  if (!domainHint) {
    return `Use your ${normalizedInstitution} email address to create a client account.`;
  }

  return `Use your ${normalizedInstitution} email address (${domainHint}), or change the institution to match your university email.`;
}

async function fetchUniversityDirectoryRecords(
  country: string,
  institution: string,
) {
  const searchParams = new URLSearchParams();

  if (country.trim()) {
    searchParams.set("country", country.trim());
  }

  if (institution.trim()) {
    searchParams.set("name", institution.trim());
  }

  if (!searchParams.toString()) {
    return [] as UniversityDirectoryRecord[];
  }

  const response = await fetch(
    `http://universities.hipolabs.com/search?${searchParams.toString()}`,
    {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(6000),
    },
  );

  if (!response.ok) {
    throw new Error(
      `University lookup failed with status ${response.status}.`,
    );
  }

  return (await response.json()) as UniversityDirectoryRecord[];
}

export async function POST(request: Request) {
  let body: ClientSignupEligibilityRequest;

  try {
    body = (await request.json()) as ClientSignupEligibilityRequest;
  } catch {
    return NextResponse.json(
      {
        allowed: false,
        message: "Could not read the client sign-up details.",
      },
      { status: 400 },
    );
  }

  const email = normalizeEmail(body.email ?? "");
  const country = body.country?.trim() ?? "";
  const institution = body.institution?.trim() ?? "";

  if (!isValidEmailAddress(email)) {
    return NextResponse.json(
      {
        allowed: false,
        message: "Enter a valid email address.",
      },
      { status: 400 },
    );
  }

  if (isAdminEmail(email)) {
    return NextResponse.json({ allowed: true, matchedInstitution: null });
  }

  const emailDomain = extractEmailDomain(email);

  if (!emailDomain) {
    return NextResponse.json(
      {
        allowed: false,
        message: "Enter a valid email address.",
      },
      { status: 400 },
    );
  }

  if (institution) {
    try {
      const directoryRecords = await fetchUniversityDirectoryRecords(
        country,
        institution,
      );
      const matchedUniversity = findUniversityDirectoryMatch(
        directoryRecords,
        institution,
      );
      const matchedDomains =
        matchedUniversity?.domains?.map((domain) => domain.trim()) ?? [];

      if (matchedDomains.length > 0) {
        const matchesInstitutionDomain = matchedDomains.some((domain) =>
          matchesUniversityEmailDomain(emailDomain, domain),
        );

        if (!matchesInstitutionDomain) {
          return NextResponse.json({
            allowed: false,
            message: buildInstitutionMismatchMessage(institution, matchedDomains),
            matchedDomains,
            matchedInstitution: matchedUniversity?.name ?? institution,
          });
        }

        return NextResponse.json({
          allowed: true,
          matchedDomains,
          matchedInstitution: matchedUniversity?.name ?? institution,
        });
      }
    } catch {
      // Fall back to domain pattern checks when the directory cannot be reached.
    }
  }

  if (isLikelyUniversityEmailDomain(emailDomain)) {
    return NextResponse.json({
      allowed: true,
      matchedInstitution: null,
      usedFallback: true,
    });
  }

  return NextResponse.json({
    allowed: false,
    message: GENERIC_UNIVERSITY_EMAIL_MESSAGE,
  });
}
