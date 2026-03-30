export function normalizePhoneNumber(value: string | null | undefined) {
  const trimmedValue = typeof value === "string" ? value.trim() : "";

  if (!trimmedValue) {
    return "";
  }

  const digitsOnly = trimmedValue.replace(/\D/g, "");

  if (!digitsOnly) {
    return "";
  }

  if (trimmedValue.startsWith("+")) {
    return `+${digitsOnly}`;
  }

  if (trimmedValue.startsWith("00")) {
    return `+${digitsOnly.slice(2)}`;
  }

  return digitsOnly;
}

export function getPhoneComparisonKey(value: string | null | undefined) {
  return normalizePhoneNumber(value).replace(/^\+/, "");
}

export function isLikelyInternationalPhoneNumber(value: string | null | undefined) {
  return /^\+\d{8,15}$/.test(normalizePhoneNumber(value));
}
