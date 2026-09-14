import { getCurrentUserProfile } from "@/lib/supabase/profile-server";
import { createClient } from "@/lib/supabase/server";
import { checkClientSignupEligibility } from "@/lib/client-signup-eligibility";
import { hasStudentClassification, type PricingCategory } from "@/lib/survey-pricing";

export async function getClientPricingContext() {
  const authenticated = await getCurrentUserProfile();
  if (!authenticated || authenticated.profile.role !== "client") return null;
  let pricingCategory: PricingCategory = "institution";
  // Use stored account classification and the confirmed auth email, never checkout fields
  // or user-editable auth metadata as evidence of discounted eligibility.
  const { data: row, error } = await createClient().from("client_profiles")
    .select("affiliation_type,position,country,educational_institution,institution_id")
    .eq("id", authenticated.profile.id).maybeSingle();
  if (error) throw error;
  if (row && authenticated.user.email_confirmed_at && authenticated.user.email && hasStudentClassification({
    role: authenticated.profile.role, affiliationType: row.affiliation_type, position: row.position
  })) {
    const response = await checkClientSignupEligibility({ email: authenticated.user.email,
      country: row.country ?? "", institution: row.educational_institution ?? "",
      institutionId: row.institution_id ?? "", affiliationType: "university" });
    const eligibility = await response.json() as { allowed?: boolean };
    if (response.ok && eligibility.allowed === true) pricingCategory = "student";
  }
  return { ...authenticated, pricingCategory };
}
