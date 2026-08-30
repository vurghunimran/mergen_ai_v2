import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  hasMailExchange,
  isKnownPersonalEmailDomain,
} from "@/lib/organization-email";
import {
  extractEmailDomain,
  formatUniversityDomains,
  isLikelyUniversityEmailDomain,
  isValidEmailAddress,
  matchesUniversityEmailDomain,
  normalizeEmail,
} from "@/lib/university-email";

type ClientSignupEligibilityRequest = {
  email?: string;
  country?: string;
  institution?: string;
  institutionId?: string;
  affiliationType?: "university" | "institution";
};

const GENERIC_UNIVERSITY_EMAIL_MESSAGE =
  "Use the work or institutional email issued by your university or organization. Personal email providers are not accepted for client accounts.";

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
  const institutionId = body.institutionId?.trim() ?? "";
  const affiliationType = body.affiliationType === "institution" ? "institution" : "university";

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

  if (isKnownPersonalEmailDomain(emailDomain)) {
    return NextResponse.json({
      allowed: false,
      message: GENERIC_UNIVERSITY_EMAIL_MESSAGE,
    });
  }

  if (institutionId) {
    try {
      const admin = createAdminClient();
      const [{ data: matchedInstitution }, { data: domainRows }] = await Promise.all([
        admin
          .from("institutions")
          .select("id,name,country_name,category")
          .eq("id", institutionId)
          .eq("active", true)
          .maybeSingle(),
        admin
          .from("institution_domains")
          .select("domain")
          .eq("institution_id", institutionId),
      ]);

      if (
        !matchedInstitution ||
        matchedInstitution.category !== affiliationType ||
        (country && matchedInstitution.country_name !== country)
      ) {
        return NextResponse.json({
          allowed: false,
          message: "Choose a valid institution for the selected country and account type.",
        });
      }

      const matchedDomains = (domainRows ?? []).map((row) => row.domain.trim());

      if (matchedDomains.length > 0) {
        const matchesInstitutionDomain = matchedDomains.some((domain) =>
          matchesUniversityEmailDomain(emailDomain, domain),
        );

        if (!matchesInstitutionDomain) {
          return NextResponse.json({
            allowed: false,
            message: buildInstitutionMismatchMessage(matchedInstitution.name, matchedDomains),
            matchedDomains,
            matchedInstitution: matchedInstitution.name,
          });
        }

        return NextResponse.json({
          allowed: true,
          matchedDomains,
          matchedInstitution: matchedInstitution.name,
        });
      }
    } catch {
      // Fall through to conservative domain checks if directory data is incomplete.
    }
  }

  if (
    isLikelyUniversityEmailDomain(emailDomain) ||
    (await hasMailExchange(emailDomain))
  ) {
    return NextResponse.json({
      allowed: true,
      matchedInstitution: institution || null,
      usedFallback: true,
    });
  }

  return NextResponse.json({
    allowed: false,
    message: GENERIC_UNIVERSITY_EMAIL_MESSAGE,
  });
}
