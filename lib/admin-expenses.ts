import { bakuDate, expenseCurrencies, expenseProviders } from "@/lib/admin-metrics";
import { RequestError } from "@/lib/security/request";

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
export function parseExpense(body: Record<string, unknown>) {
  if (!isUuid(body.id)) throw new RequestError("A valid entry ID is required.");
  if (!expenseProviders.includes(body.provider as typeof expenseProviders[number])) throw new RequestError("Choose a provider.");
  if (body.kind !== "expense" && body.kind !== "top_up") throw new RequestError("Choose expense or balance top-up.");
  if (!expenseCurrencies.includes(body.currency as typeof expenseCurrencies[number])) throw new RequestError("Choose a supported currency.");
  if (typeof body.amount !== "string" || !/^\d{1,7}(\.\d{1,2})?$/.test(body.amount)) throw new RequestError("Enter a positive amount with at most two decimal places.");
  const [whole, fraction = ""] = body.amount.split(".");
  const amount_cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (amount_cents <= 0 || amount_cents > 100_000_000) throw new RequestError("Amount must be between 0.01 and 1,000,000.");
  const date = body.paid_on;
  if (typeof date !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date > bakuDate()) throw new RequestError("Enter a valid payment date, no later than today.");
  if (typeof body.description !== "string" || !body.description.trim() || body.description.length > 500) throw new RequestError("Add a description, up to 500 characters.");
  if (typeof body.reference !== "string" || body.reference.length > 120) throw new RequestError("Reference must be at most 120 characters.");
  return { id: body.id, provider: body.provider as string, kind: body.kind, currency: body.currency as string,
    amount_cents, paid_on: date, description: body.description.trim(), reference: body.reference.trim() };
}
