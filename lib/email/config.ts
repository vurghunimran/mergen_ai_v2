import { Resend } from "resend";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function createResendClient() {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  if (!resendApiKey) {
    throw new Error("Missing RESEND_API_KEY.");
  }

  return new Resend(resendApiKey);
}

export function getResendFromEmail(fallback = "MERGEN AI <onboarding@resend.dev>") {
  return process.env.RESEND_FROM_EMAIL?.trim() || fallback;
}

export function getContactInboxEmail() {
  return process.env.CONTACT_TO_EMAIL?.trim() || process.env.TO_EMAIL?.trim() || "";
}

export function getAppBaseUrl(request?: Request) {
  const configuredBaseUrl = process.env.APP_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return trimTrailingSlash(configuredBaseUrl);
  }

  if (!request) {
    return "";
  }

  return trimTrailingSlash(new URL(request.url).origin);
}
