import { createAdminClient } from "@/lib/supabase/admin";
import { trolleyRequest, type TrolleyBatch, type TrolleyPayment } from "@/lib/trolley";

export type CashWithdrawal = {
  id: string; member_id: string; activation_id: string; request_key: string; credits: number;
  amount_cents: number; currency: string; recipient_id: string; status: string;
  batch_id: string | null; payment_id: string | null; created_at: string;
  target_amount: string | null; target_currency: string | null;
};
export function publicWithdrawal(row: CashWithdrawal) {
  return { id: row.id, credits: row.credits, amountCents: row.amount_cents, currency: row.currency,
    status: row.status, createdAt: row.created_at, targetAmount: row.target_amount, targetCurrency: row.target_currency };
}
async function updateWithdrawal(id: string, values: Record<string, unknown>) {
  const { error } = await createAdminClient().from("cash_withdrawals").update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id).in("status", ["submitting", "review", "processing"]);
  if (error) throw new Error("Could not persist withdrawal progress.");
}
function assertPayment(row: CashWithdrawal, payment: TrolleyPayment) {
  if (!/^P-[a-zA-Z0-9]+$/.test(payment.id) || payment.externalId !== row.id || payment.recipient?.id !== row.recipient_id ||
      payment.batch?.id !== row.batch_id || payment.sourceCurrency !== "USD" ||
      !Number.isFinite(Number(payment.sourceAmount)) || Number(payment.sourceAmount) * 100 < row.amount_cents) {
    throw new Error("Provider payment does not match the withdrawal.");
  }
}
export async function syncCashWithdrawal(row: CashWithdrawal) {
  if (!row.batch_id || !row.payment_id) return;
  const { payment } = await trolleyRequest<{ payment: TrolleyPayment }>("GET", `/v1/batches/${row.batch_id}/payments/${row.payment_id}`, undefined, "live");
  assertPayment(row, payment);
  const { error } = await createAdminClient().rpc("settle_cash_withdrawal", {
    p_id: row.id, p_payment: payment.id, p_status: payment.status, p_updated: payment.updatedAt,
    p_target_amount: payment.targetAmount ?? null, p_target_currency: payment.targetCurrency ?? null
  });
  if (error) throw new Error("Could not settle withdrawal state.");
}

// A batch POST has no documented idempotency key. Never repeat it after an ambiguous response.
// Recovery discovers the original batch using its unique withdrawal tag.
export async function recoverCashWithdrawal(row: CashWithdrawal) {
  if (!row.batch_id) {
    const tag = `mergen-withdrawal-${row.id}`;
    const { batches } = await trolleyRequest<{ batches: TrolleyBatch[] }>("GET", `/v1/batches?tags=${encodeURIComponent(tag)}&pageSize=100`, undefined, "live");
    const matches = batches.filter(batch => batch.tags.includes(tag));
    if (matches.length !== 1) throw new Error("Withdrawal requires provider review; no unique batch was found.");
    row = { ...row, batch_id: matches[0].id };
    await updateWithdrawal(row.id, { batch_id: row.batch_id });
  }
  if (!row.payment_id) {
    const { payments } = await trolleyRequest<{ payments: TrolleyPayment[] }>("GET", `/v1/batches/${row.batch_id}/payments?pageSize=100`, undefined, "live");
    const matches = payments.filter(payment => payment.externalId === row.id);
    if (matches.length > 1 || payments.length > 1) throw new Error("Withdrawal batch requires review.");
    if (matches[0]) {
      assertPayment(row, matches[0]);
      row = { ...row, payment_id: matches[0].id };
      await updateWithdrawal(row.id, { payment_id: row.payment_id });
    }
  }
  return row;
}

export async function processCashWithdrawal(row: CashWithdrawal, createBatch = false) {
  try {
    if (createBatch) {
      const { data, error } = await createAdminClient().rpc("claim_cash_withdrawal", { p_id: row.id });
      if (error) throw new Error("Could not claim withdrawal.");
      if (!data?.id) return; // Another request already owns the submission.
      row = data;
      const { batch } = await trolleyRequest<{ batch: TrolleyBatch }>("POST", "/v1/batches", {
        currency: "USD", description: `MERGEN cash withdrawal ${row.id}`, tags: [`mergen-withdrawal-${row.id}`]
      }, "live");
      if (!/^B-[a-zA-Z0-9]+$/.test(batch.id)) throw new Error("Invalid provider batch.");
      row = { ...row, batch_id: batch.id };
      await updateWithdrawal(row.id, { batch_id: batch.id });
    } else {
      if (row.status === "queued") return processCashWithdrawal(row, true);
      row = await recoverCashWithdrawal(row);
    }
    const { batch } = await trolleyRequest<{ batch: TrolleyBatch }>("GET", `/v1/batches/${row.batch_id}`, undefined, "live");
    if (!row.payment_id) {
      if (batch.status !== "open") throw new Error("Withdrawal batch requires review.");
      const { payment } = await trolleyRequest<{ payment: TrolleyPayment }>("POST", `/v1/batches/${row.batch_id}/payments`, {
        recipient: { id: row.recipient_id }, amount: (row.amount_cents / 100).toFixed(2), currency: "USD",
        externalId: row.id, memo: "MERGEN survey earnings", coverFees: true, category: "services"
      }, "live");
      assertPayment(row, payment);
      row = { ...row, payment_id: payment.id };
      await updateWithdrawal(row.id, { payment_id: payment.id });
    }
    if (batch.status === "open") {
      await trolleyRequest("POST", `/v1/batches/${row.batch_id}/generate-quote`, undefined, "live");
    }
    if (["open", "accepted"].includes(batch.status)) {
      await trolleyRequest("POST", `/v1/batches/${row.batch_id}/start-processing`, undefined, "live");
    }
    await syncCashWithdrawal(row);
  } catch {
    await updateWithdrawal(row.id, { status: "review" });
    // Keep the reservation until a provider-confirmed failure/return. Network errors are ambiguous.
  }
}

export async function cancelUnprocessedCashWithdrawal(row: CashWithdrawal) {
  row = await recoverCashWithdrawal(row);
  const { batch } = await trolleyRequest<{ batch: TrolleyBatch }>("GET", `/v1/batches/${row.batch_id}`, undefined, "live");
  if (batch.status !== "open") throw new Error("Only an unprocessed batch can be cancelled.");
  // A confirmed provider deletion makes the original batch incapable of paying later.
  // If deletion times out, do not release credits: reconcile with Trolley first.
  await trolleyRequest("DELETE", `/v1/batches/${row.batch_id}`, undefined, "live");
  const { error } = await createAdminClient().rpc("cancel_deleted_cash_withdrawal", { p_id: row.id, p_batch: row.batch_id });
  if (error) throw new Error("Could not release withdrawal credits.");
}
