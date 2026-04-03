type HookEvent = {
  user?: {
    email?: string | null;
    user_metadata?: {
      role?: string;
      educational_institution?: string;
      country?: string;
    } | null;
  } | null;
};

type HookResponse = Record<string, never> | {
  error: {
    http_code: number;
    message: string;
  };
};

type UniversityDirectoryRecord = {
  name?: string;
  domains?: string[];
};

const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNIVERSITY_DOMAIN_PATTERN =
  /(?:\.edu$)|(?:\.(?:edu|ac)\.[a-z]{2,}(?:\.[a-z]{2,})?$)/i;

const GENERIC_UNIVERSITY_EMAIL_MESSAGE =
  "Use the email address issued by your university. Personal email providers are not accepted for client accounts.";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeInstitutionName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractEmailDomain(email: string) {
  const [, domain = ""] = normalizeEmail(email).split("@");
  return domain;
}

function isValidEmailAddress(value: string) {
  return EMAIL_ADDRESS_PATTERN.test(normalizeEmail(value));
}

function isLikelyUniversityEmailDomain(domain: string) {
  return UNIVERSITY_DOMAIN_PATTERN.test(domain.trim().toLowerCase());
}

function matchesUniversityEmailDomain(
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

function formatUniversityDomains(domains: string[]) {
  return domains
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 3)
    .map((domain) => `@${domain}`)
    .join(", ");
}

function findUniversityDirectoryMatch(
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

function getConfiguredAdminEmails() {
  return [Deno.env.get("ADMIN_EMAIL") ?? "", Deno.env.get("ADMIN_EMAILS") ?? ""]
    .filter(Boolean)
    .join(",")
    .split(/[\n,]/)
    .map((value) => normalizeEmail(value))
    .filter(Boolean);
}

function isAdminEmail(email: string) {
  return getConfiguredAdminEmails().includes(normalizeEmail(email));
}

function reject(message: string, httpCode = 400): HookResponse {
  return {
    error: {
      http_code: httpCode,
      message,
    },
  };
}

function allow(): HookResponse {
  return {};
}

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
    },
  );

  if (!response.ok) {
    throw new Error(`University lookup failed with status ${response.status}.`);
  }

  return (await response.json()) as UniversityDirectoryRecord[];
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return Response.json(reject("Method not allowed.", 405), { status: 405 });
  }

  let event: HookEvent;

  try {
    event = (await request.json()) as HookEvent;
  } catch {
    return Response.json(reject("Could not read hook payload.", 400), {
      status: 400,
    });
  }

  const role = event.user?.user_metadata?.role ?? "";

  if (role !== "client") {
    return Response.json(allow(), { status: 200 });
  }

  const email = normalizeEmail(event.user?.email ?? "");

  if (!isValidEmailAddress(email)) {
    return Response.json(reject("Enter a valid email address.", 400), {
      status: 400,
    });
  }

  if (isAdminEmail(email)) {
    return Response.json(allow(), { status: 200 });
  }

  const institution =
    event.user?.user_metadata?.educational_institution?.trim() ?? "";
  const country = event.user?.user_metadata?.country?.trim() ?? "";
  const emailDomain = extractEmailDomain(email);

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
          return Response.json(
            reject(
              buildInstitutionMismatchMessage(institution, matchedDomains),
              400,
            ),
            { status: 400 },
          );
        }

        return Response.json(allow(), { status: 200 });
      }
    } catch {
      // Fall back to domain pattern checks if the university directory is unavailable.
    }
  }

  if (isLikelyUniversityEmailDomain(emailDomain)) {
    return Response.json(allow(), { status: 200 });
  }

  return Response.json(reject(GENERIC_UNIVERSITY_EMAIL_MESSAGE, 400), {
    status: 400,
  });
});
