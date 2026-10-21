/** Regras comerciais da plataforma: planos, teste grátis, vencimento e carência. */
export const BILLING_PLAN_KEYS = ["basico", "pro", "enterprise"] as const;
export type BillingPlanKey = (typeof BILLING_PLAN_KEYS)[number];
export type BillingCycle = "mensal" | "anual";
export type BillingMode = "pontual" | "recorrente";

export const TRIAL_DAYS = 30;
export const GRACE_DAYS = 7;
/** Igrejas criadas antes da cobrança ganham o teste a partir desta data, e não da data de criação. */
export const BILLING_ROLLOUT_AT = "2026-10-21T12:00:00.000Z";

/** Valores em centavos. No plano anual, `anualPorMesCents` é o valor mensal equivalente (cobrado de uma vez, x12). */
export const BILLING_PLANS: Record<BillingPlanKey, { name: string; mensalCents: number; anualPorMesCents: number }> = {
  basico: { name: "Básico", mensalCents: 9700, anualPorMesCents: 7700 },
  pro: { name: "Pro", mensalCents: 19700, anualPorMesCents: 15700 },
  enterprise: { name: "Enterprise", mensalCents: 49700, anualPorMesCents: 39700 },
};

export function billingAmountCents(plan: BillingPlanKey, cycle: BillingCycle): number {
  const item = BILLING_PLANS[plan];
  return cycle === "anual" ? item.anualPorMesCents * 12 : item.mensalCents;
}

export function billingCycleMonths(cycle: BillingCycle): number {
  return cycle === "anual" ? 12 : 1;
}

export function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type BillingPhase = "teste" | "ativa" | "carencia" | "vencida";

export type BillingState = {
  phase: BillingPhase;
  /** Dias até o fim da fase atual (teste, assinatura ou carência). Negativo não ocorre. */
  daysLeft: number;
  trialEndsAt: string;
  paidUntil: string | null;
  graceEndsAt: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function trialEndsAtFor(createdAt: Date): Date {
  const start = Math.max(createdAt.getTime(), new Date(BILLING_ROLLOUT_AT).getTime());
  return new Date(start + TRIAL_DAYS * DAY_MS);
}

function daysUntil(target: Date, now: Date): number {
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / DAY_MS));
}

export function computeBillingState(input: { createdAt: Date; paidUntil: Date | null; now?: Date }): BillingState {
  const now = input.now ?? new Date();
  const trialEnds = trialEndsAtFor(input.createdAt);
  const paidUntil = input.paidUntil;
  const base = { trialEndsAt: trialEnds.toISOString(), paidUntil: paidUntil ? paidUntil.toISOString() : null };
  // O pagamento sempre vale mais que o teste; sem pagamento, vale o fim do teste.
  const coveredUntil = paidUntil && paidUntil.getTime() > trialEnds.getTime() ? paidUntil : trialEnds;
  const graceEnds = new Date(coveredUntil.getTime() + GRACE_DAYS * DAY_MS);
  if (now.getTime() < coveredUntil.getTime()) {
    return { ...base, phase: paidUntil && coveredUntil === paidUntil ? "ativa" : "teste", daysLeft: daysUntil(coveredUntil, now), graceEndsAt: null };
  }
  if (now.getTime() < graceEnds.getTime()) {
    return { ...base, phase: "carencia", daysLeft: daysUntil(graceEnds, now), graceEndsAt: graceEnds.toISOString() };
  }
  return { ...base, phase: "vencida", daysLeft: 0, graceEndsAt: graceEnds.toISOString() };
}

/** Novo fim de vigência ao confirmar um pagamento: soma a partir do fim atual ou de hoje, o que for maior. */
export function extendPaidUntil(current: Date | null, months: number, now: Date = new Date()): Date {
  const start = current && current.getTime() > now.getTime() ? current : now;
  return addMonths(start, months);
}

export const PAYMENT_REFERENCE_PREFIX = "idf-pay-";
export const CUSTOMER_REFERENCE_PREFIX = "idf-church-";
