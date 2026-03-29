import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile, UserRole } from "@/lib/supabase/types";

export type PersistedProfilePayload = {
  role: UserRole;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  appearance: "light" | "dark";
  two_factor_enabled: boolean;
  country?: string;
  educational_institution?: string;
  position?: string;
  age_span?: string;
  gender?: string;
  employment_status?: string;
  industry?: string;
  salary_range?: string;
  educational_level?: string;
  field_of_study?: string;
  language_skills?: string[];
  english_proficiency?: string;
  place_of_residence?: string;
  family_status?: string;
  household_size?: string;
  children_count?: string;
  interests?: string[];
  car_count?: string;
};

type ProfileSupabaseClient = Pick<SupabaseClient, "from">;

export function buildPersistedProfilePayload(profile: UserProfile): PersistedProfilePayload {
  return {
    role: profile.role,
    email: profile.email,
    first_name: profile.firstName,
    last_name: profile.lastName,
    phone_number: profile.phoneNumber,
    appearance: profile.appearance,
    two_factor_enabled: profile.twoFactorEnabled,
    country: profile.country,
    educational_institution: profile.educationalInstitution,
    position: profile.position,
    age_span: profile.ageSpan,
    gender: profile.gender,
    employment_status: profile.employmentStatus,
    industry: profile.industry,
    salary_range: profile.salaryRange,
    educational_level: profile.educationalLevel,
    field_of_study: profile.fieldOfStudy,
    language_skills: profile.languageSkills,
    english_proficiency: profile.englishProficiency,
    place_of_residence: profile.placeOfResidence,
    family_status: profile.familyStatus,
    household_size: profile.householdSize,
    children_count: profile.childrenCount,
    interests: profile.interests,
    car_count: profile.carCount
  };
}

export async function upsertProfileRecords(
  supabase: ProfileSupabaseClient,
  userId: string,
  payload: PersistedProfilePayload
) {
  const { error: baseError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      role: payload.role,
      email: payload.email,
      first_name: payload.first_name,
      last_name: payload.last_name,
      phone_number: payload.phone_number || null,
      appearance: payload.appearance,
      two_factor_enabled: payload.two_factor_enabled
    },
    {
      onConflict: "id"
    }
  );

  if (baseError) {
    throw baseError;
  }

  if (payload.role === "client") {
    const { error: clientError } = await supabase.from("client_profiles").upsert(
      {
        id: userId,
        country: payload.country || null,
        educational_institution: payload.educational_institution || null,
        position: payload.position || null
      },
      {
        onConflict: "id"
      }
    );

    if (clientError) {
      throw clientError;
    }

    return;
  }

  const { error: communityError } = await supabase.from("community_profiles").upsert(
    {
      id: userId,
      country: payload.country || null,
      age_span: payload.age_span || null,
      gender: payload.gender || null,
      employment_status: payload.employment_status || null,
      industry: payload.industry || null,
      salary_range: payload.salary_range || null,
      educational_level: payload.educational_level || null,
      field_of_study: payload.field_of_study || null,
      language_skills: payload.language_skills ?? [],
      english_proficiency: payload.english_proficiency || null,
      place_of_residence: payload.place_of_residence || null,
      family_status: payload.family_status || null,
      household_size: payload.household_size || null,
      children_count: payload.children_count || null,
      interests: payload.interests ?? [],
      car_count: payload.car_count || null
    },
    {
      onConflict: "id"
    }
  );

  if (communityError) {
    throw communityError;
  }
}
