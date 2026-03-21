export type UserRole = "client" | "community";

export type ProfileAppearance = "light" | "dark";

export type BaseProfileRow = {
  id: string;
  role: UserRole;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  appearance: ProfileAppearance | null;
  two_factor_enabled: boolean | null;
};

export type ClientProfileRow = {
  id: string;
  country: string | null;
  educational_institution: string | null;
  position: string | null;
};

export type CommunityProfileRow = {
  id: string;
  country: string | null;
  age_span: string | null;
  gender: string | null;
  salary_range: string | null;
  educational_level: string | null;
  place_of_residence: string | null;
  family_status: string | null;
  interests: string[] | null;
  car_count: string | null;
};

export type UserProfile = {
  id: string;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  country: string;
  educationalInstitution: string;
  position: string;
  ageSpan: string;
  gender: string;
  salaryRange: string;
  educationalLevel: string;
  placeOfResidence: string;
  familyStatus: string;
  interests: string[];
  carCount: string;
  appearance: ProfileAppearance;
  twoFactorEnabled: boolean;
};

export function isUserRole(value: unknown): value is UserRole {
  return value === "client" || value === "community";
}
