import { resolveMx } from "node:dns/promises";

const PERSONAL_EMAIL_DOMAINS = new Set([
  "aol.com",
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "mail.com",
  "mail.ru",
  "outlook.com",
  "proton.me",
  "protonmail.com",
  "rambler.ru",
  "tuta.com",
  "tutanota.com",
  "yahoo.com",
  "yandex.com",
  "yandex.ru",
  "zoho.com",
]);

export function isKnownPersonalEmailDomain(domain: string) {
  return PERSONAL_EMAIL_DOMAINS.has(domain.trim().toLowerCase());
}

export async function hasMailExchange(domain: string) {
  try {
    const records = await resolveMx(domain.trim().toLowerCase());
    return records.length > 0;
  } catch {
    return false;
  }
}
