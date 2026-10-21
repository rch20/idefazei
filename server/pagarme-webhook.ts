import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { platformPayments } from "../drizzle/schema";
import { BILLING_PLAN_KEYS, CUSTOMER_REFERENCE_PREFIX, PAYMENT_REFERENCE_PREFIX, billingAmountCents, type BillingCycle, type BillingPlanKey } from "../shared/billing";
import { applyPaidCharge, loadPagarmeConfig, pagarmeRequest, webhookTokenMatches } from "./billing";
import { getDb } from "./db";

type Charge = Record<string, any>;

function planFromAmount(amountCents: number): { plan: BillingPlanKey; cycle: BillingCycle } | null {
  for (const plan of BILLING_PLAN_KEYS) {
    for (const cycle of ["mensal", "anual"] as const) {
      if (billingAmountCents(plan, cycle) === amountCents) return { plan, cycle };
    }
  }
  return null;
}

async function processPaidCharge(charge: Charge, config: Awaited<ReturnType<typeof loadPagarmeConfig>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const chargeId = String(charge.id ?? "");
  const amount = Number(charge.paid_amount ?? charge.amount ?? 0);
  const method = typeof charge.payment_method === "string" ? charge.payment_method : null;

  let orderCode: string | null = typeof charge.order?.code === "string" ? charge.order.code : null;
  if (!orderCode && charge.order?.id) {
    const order = await pagarmeRequest<Charge>(config, "GET", `/orders/${encodeURIComponent(String(charge.order.id))}`).catch(() => null);
    if (typeof order?.code === "string") orderCode = order.code;
  }

  if (orderCode?.startsWith(PAYMENT_REFERENCE_PREFIX)) {
    const rowId = Number(orderCode.slice(PAYMENT_REFERENCE_PREFIX.length));
    const [row] = Number.isInteger(rowId) ? await db.select().from(platformPayments).where(eq(platformPayments.id, rowId)).limit(1) : [];
    if (!row) { console.error(`[pagarme] cobrança ${chargeId}: pedido ${orderCode} não existe aqui`); return; }
    if (amount < row.amountCents) { console.error(`[pagarme] cobrança ${chargeId}: valor pago ${amount} menor que ${row.amountCents}`); return; }
    await applyPaidCharge({ churchId: row.churchId, plan: row.planKey as BillingPlanKey, cycle: row.cycle, mode: "pontual", amountCents: row.amountCents, chargeId, paymentRowId: row.id, method });
    return;
  }

  // Assinatura recorrente: a igreja é identificada pelo código do cliente enviado na criação do link.
  const customerCode: string | null = typeof charge.customer?.code === "string" ? charge.customer.code : null;
  if (customerCode?.startsWith(CUSTOMER_REFERENCE_PREFIX)) {
    const churchId = Number(customerCode.slice(CUSTOMER_REFERENCE_PREFIX.length));
    const matched = planFromAmount(amount);
    if (Number.isInteger(churchId) && matched) {
      const subscriptionId = typeof charge.invoice?.subscriptionId === "string" ? charge.invoice.subscriptionId : typeof charge.subscription?.id === "string" ? charge.subscription.id : null;
      await applyPaidCharge({ churchId, plan: matched.plan, cycle: matched.cycle, mode: "recorrente", amountCents: amount, chargeId, method, subscriptionId });
      return;
    }
  }
  console.error(`[pagarme] cobrança ${chargeId} paga, mas sem igreja correspondente (pedido=${orderCode ?? "-"}, cliente=${customerCode ?? "-"}). Lance manualmente no Super Admin.`);
}

/** Webhook do Pagar.me. A confirmação nunca confia no corpo recebido: a cobrança é consultada de novo na API. */
export async function pagarmeWebhookHandler(req: Request, res: Response) {
  const config = await loadPagarmeConfig();
  const token = String(req.params.token ?? "");
  if (!config.secretKeyEnc || !webhookTokenMatches(token, config.webhookToken)) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  try {
    const type = String(req.body?.type ?? "");
    const data = (req.body?.data ?? {}) as Charge;
    if (type === "charge.paid" || type === "order.paid") {
      const ids: string[] = type === "charge.paid" ? [String(data.id ?? "")] : (Array.isArray(data.charges) ? data.charges : []).map((item: Charge) => String(item.id ?? ""));
      for (const id of ids.filter(Boolean)) {
        const charge = await pagarmeRequest<Charge>(config, "GET", `/charges/${encodeURIComponent(id)}`);
        if (charge?.status === "paid") await processPaidCharge(charge, config);
      }
    } else if (type === "charge.payment_failed") {
      const code = typeof data.order?.code === "string" ? data.order.code : "";
      const rowId = code.startsWith(PAYMENT_REFERENCE_PREFIX) ? Number(code.slice(PAYMENT_REFERENCE_PREFIX.length)) : NaN;
      const db = await getDb();
      if (db && Number.isInteger(rowId)) {
        const [row] = await db.select().from(platformPayments).where(eq(platformPayments.id, rowId)).limit(1);
        if (row?.status === "pendente") await db.update(platformPayments).set({ status: "falhou", note: "Pagamento recusado no Pagar.me" }).where(eq(platformPayments.id, rowId));
      }
    }
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("[pagarme] falha ao processar webhook:", error instanceof Error ? error.message : error);
    res.status(500).json({ error: "processing_failed" }); // o Pagar.me reenvia
  }
}
