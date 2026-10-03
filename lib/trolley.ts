import { createHmac, timingSafeEqual } from "node:crypto";

export const CASH_WITHDRAWAL_CREDITS = 920;
export const CASH_WITHDRAWAL_CENTS = 1000;
export type TrolleyMode = "sandbox" | "live";
export type TrolleyRecipient = {
  id: string; referenceId: string; email: string; status: string;
  payoutMethod: string; primaryCurrency: string; routeMinimum?: string;
  address?: { country?: string };
};
export type TrolleyPayment = {
  id: string; externalId: string; status: string; updatedAt: string;
  recipient: { id: string }; batch: { id: string };
  sourceAmount: string; sourceCurrency: string; targetAmount?: string; targetCurrency?: string;
};
export type TrolleyBatch = { id: string; status: string; tags: string[] };

export function trolleyMode(): TrolleyMode {
  return process.env.TROLLEY_MODE === "live" ? "live" : "sandbox";
}
function credentials(mode: TrolleyMode) {
  const prefix = mode === "live" ? "TROLLEY_LIVE" : "TROLLEY_SANDBOX";
  const key = process.env[`${prefix}_ACCESS_KEY`];
  const secret = process.env[`${prefix}_SECRET_KEY`];
  if (!key || !secret) throw new Error("Trolley credentials are not configured.");
  return { key, secret };
}
export function trolleyConfigured(mode = trolleyMode()) {
  try { credentials(mode); return true; } catch { return false; }
}
export function cashWithdrawalsEnabled() {
  return process.env.TROLLEY_WITHDRAWALS_ENABLED === "true" && trolleyMode() === "live" &&
    trolleyConfigured("live") && Boolean(process.env.TROLLEY_LIVE_WEBHOOK_SECRET);
}
export function trolleyCountryEnabled(code: string) {
  return (process.env.TROLLEY_ALLOWED_COUNTRIES ?? "").split(",").map(x => x.trim().toUpperCase()).includes(code);
}
export function withdrawalAmount(credits: unknown) {
  if (typeof credits !== "number" || !Number.isSafeInteger(credits) || credits < CASH_WITHDRAWAL_CREDITS ||
      credits > 920_000 || credits % CASH_WITHDRAWAL_CREDITS !== 0) {
    throw new Error("Choose a multiple of 920 credits, up to 920,000 credits.");
  }
  return credits / CASH_WITHDRAWAL_CREDITS * CASH_WITHDRAWAL_CENTS;
}
export async function trolleyRequest<T>(method: "GET" | "POST" | "DELETE", path: string, value?: unknown, mode = trolleyMode()): Promise<T> {
  const { key, secret } = credentials(mode);
  const body = value === undefined ? "" : JSON.stringify(value);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", secret).update(`${timestamp}\n${method}\n${path}\n${body}\n`).digest("hex");
  const response = await fetch(`https://api.trolley.com${path}`, {
    method, headers: { Authorization: `prsign ${key}:${signature}`, "X-PR-Timestamp": timestamp,
      "Content-Type": "application/json", Accept: "application/json" },
    ...(body ? { body } : {}), cache: "no-store", signal: AbortSignal.timeout(20_000)
  });
  const result = await response.json().catch(() => null);
  // Provider errors can include bank details. Keep them out of client responses and logs.
  if (!response.ok || result?.ok !== true) throw new Error("Trolley could not complete this request.");
  return result as T;
}
export function trolleyWidgetUrl(member: { id: string; email: string }, mode = trolleyMode()) {
  const { key, secret } = credentials(mode);
  const query = new URLSearchParams({ ts: Math.floor(Date.now() / 1000).toString(), key,
    email: member.email, refid: member.id, roEmail: "true", hideEmail: "false",
    payoutMethods: "bank-transfer", products: "pay,tax", locale: "en" }).toString().replace(/\+/g, "%20");
  return `https://widget.trolley.com?${query}&sign=${createHmac("sha256", secret).update(query).digest("hex")}`;
}
export function verifyTrolleyWebhook(raw: string, header: string | null, secret: string | undefined, now = Date.now()) {
  if (!secret || !header) return false;
  const parts = header.split(",").map(x => x.trim().split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signature = parts.find(([key]) => key === "v1")?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || !signature || !/^[0-9a-f]{64}$/i.test(signature) ||
      Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(timestamp + raw).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
export async function findTrolleyRecipient(memberId: string, mode = trolleyMode()) {
  const result = await trolleyRequest<{ recipients: TrolleyRecipient[] }>("GET",
    `/v1/recipients?referenceId=${encodeURIComponent(memberId)}&pageSize=100`, undefined, mode);
  const matches = result.recipients.filter(x => x.referenceId === memberId);
  if (matches.length > 1) throw new Error("Recipient mapping needs review.");
  if (!matches[0]) return null;
  const details = await trolleyRequest<{ recipient: TrolleyRecipient }>("GET", `/v1/recipients/${encodeURIComponent(matches[0].id)}`, undefined, mode);
  if (details.recipient.referenceId !== memberId) throw new Error("Recipient mapping needs review.");
  return details.recipient;
}
