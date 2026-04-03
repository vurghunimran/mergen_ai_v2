export type ClientUniversityEmailEligibilityResponse = {
  allowed?: boolean;
  message?: string;
  matchedDomains?: string[];
  matchedInstitution?: string | null;
  usedFallback?: boolean;
};

type ClientUniversityEmailValidationParams = {
  email: string;
  country?: string;
  institution?: string;
};

const DEFAULT_UNIVERSITY_EMAIL_MESSAGE =
  "Use the email address issued by your university.";

export async function assertClientUniversityEmail(
  params: ClientUniversityEmailValidationParams,
) {
  const response = await fetch("/api/client-signup/eligibility", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(params),
  });

  const payload =
    (await response.json().catch(() => null)) as
      | ClientUniversityEmailEligibilityResponse
      | null;

  if (!response.ok || !payload?.allowed) {
    throw new Error(payload?.message ?? DEFAULT_UNIVERSITY_EMAIL_MESSAGE);
  }

  return payload;
}
