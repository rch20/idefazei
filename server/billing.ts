import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { churches, platformPayments, platformSettings } from "../drizzle/schema";
import {
  BILLING_PLANS,
  CUSTOMER_REFERENCE_PREFIX,
  PAYMENT_REFERENCE_PREFIX,
  billingAmountCents,
  billingCycleMonths,
  computeBillingState,
  extendPaidUntil,
  type BillingCycle,
  type BillingMode,
  type BillingPlanKey,
} from "../shared/billing";
import { ENV } from "./_core/env";
import { getDb } from "./db";

export const PAGARME_SETTING_KEY = "pagarme";
export const PAGARME_TEST_BASE_URL = "https://sdx-api.pagar.me/core/v5";
export const PAGARME_LIVE_BASE_URL = "https://api.pagar.me/core/v5";
const USER_AGENT = "idefazei-billing/1.0";

type StoredConfig = {
  baseUrl: string;
  secretKeyEnc: string | null;
  publicKey: string;
  webhookToken: string;
  enforce: boolean;
  planIds: Record<string, string>;
};

const EMPTY_CONFIG: StoredConfig = { baseUrl: PAGARME_TEST_BASE_URL, secretKeyEnc: null, publicKey: "", webhookToken: "", enforce: false, planIds: {} };

// ─── Criptografia da chave secreta (nunca volta para o navegador) ─────────────
function encryptionKey() {
  const secret = ENV.cookieSecret || process.env.JWT_SECRET || "";
  if (!secret) throw new Error("JWT_SECRET ausente: não é possível guardar a chave secreta com segurança.");
  return createHash("sha256").update(`pagarme-settings:${secret}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), body.toString("base64")].join(":");
}

export function decryptSecret(stored: string): string {
  const [version, iv, tag, body] = stored.split(":");
  if (version !== "v1" || !iv || !tag || !body) throw new Error("Formato de chave inválido.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]).toString("utf8");
}

export function maskSecret(secret: string): string {
  return secret.length <= 8 ? "••••" : `${secret.slice(0, 8)}••••${secret.slice(-4)}`;
}

/** Só aceita endereços HTTPS do próprio Pagar.me, para a configuração não virar um desvio de requisições. */
export function normalizePagarmeBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Endereço da API inválido.");
  }
  if (url.protocol !== "https:" || !(url.hostname === "pagar.me" || url.hostname.endsWith(".pagar.me"))) {
    throw new Error("O endereço da API precisa ser HTTPS e terminar em pagar.me.");
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}` || url.origin;
}

// ─── Configuração ─────────────────────────────────────────────────────────────
export async function loadPagarmeConfig(): Promise<StoredConfig> {
  const db = await getDb();
  if (!db) return { ...EMPTY_CONFIG };
  try {
    const [row] = await db.select({ value: platformSettings.settingValue }).from(platformSettings).where(eq(platformSettings.settingKey, PAGARME_SETTING_KEY)).limit(1);
    if (!row?.value) return { ...EMPTY_CONFIG };
    return { ...EMPTY_CONFIG, ...(JSON.parse(row.value) as Partial<StoredConfig>) };
  } catch {
    return { ...EMPTY_CONFIG };
  }
}

async function persistPagarmeConfig(config: StoredConfig, updatedBy: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const value = JSON.stringify(config);
  await db.insert(platformSettings).values({ settingKey: PAGARME_SETTING_KEY, settingValue: value, updatedBy: updatedBy.slice(0, 160) })
    .onDuplicateKeyUpdate({ set: { settingValue: value, updatedBy: updatedBy.slice(0, 160) } });
}

export type PagarmeAdminView = {
  configured: boolean;
  baseUrl: string;
  environment: "teste" | "producao" | "personalizado";
  secretKeyMasked: string | null;
  publicKey: string;
  webhookPath: string;
  enforce: boolean;
};

function environmentOf(baseUrl: string): PagarmeAdminView["environment"] {
  return baseUrl === PAGARME_TEST_BASE_URL ? "teste" : baseUrl === PAGARME_LIVE_BASE_URL ? "producao" : "personalizado";
}

export async function getPagarmeAdminView(): Promise<PagarmeAdminView> {
  const config = await loadPagarmeConfig();
  let secretKeyMasked: string | null = null;
  if (config.secretKeyEnc) {
    try {
      secretKeyMasked = maskSecret(decryptSecret(config.secretKeyEnc));
    } catch {
      secretKeyMasked = "ilegível — salve a chave de novo";
    }
  }
  return {
    configured: Boolean(config.secretKeyEnc),
    baseUrl: config.baseUrl,
    environment: environmentOf(config.baseUrl),
    secretKeyMasked,
    publicKey: config.publicKey,
    webhookPath: config.webhookToken ? `/api/webhooks/pagarme/${config.webhookToken}` : "",
    enforce: config.enforce,
  };
}

export async function savePagarmeConfig(input: { baseUrl: string; secretKey?: string; publicKey?: string; enforce: boolean; regenerateWebhookToken?: boolean }, updatedBy: string) {
  const current = await loadPagarmeConfig();
  const next: StoredConfig = { ...current, baseUrl: normalizePagarmeBaseUrl(input.baseUrl), enforce: input.enforce };
  if (input.baseUrl !== current.baseUrl) next.planIds = {}; // planos de teste não valem em produção
  if (input.secretKey?.trim()) {
    const secret = input.secretKey.trim();
    if (!/^sk_(test_|live_)?[A-Za-z0-9]{8,}$/.test(secret)) throw new Error("A chave secreta deve começar com sk_.");
    next.secretKeyEnc = encryptSecret(secret);
    next.planIds = {};
  }
  if (input.publicKey !== undefined) next.publicKey = input.publicKey.trim().slice(0, 120);
  if (!next.webhookToken || input.regenerateWebhookToken) next.webhookToken = randomBytes(24).toString("hex");
  await persistPagarmeConfig(next, updatedBy);
}

export async function isBillingEnforced(): Promise<boolean> {
  return (await loadPagarmeConfig()).enforce;
}

export function webhookTokenMatches(provided: string, expected: string): boolean {
  if (!expected || provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

// ─── Chamadas à API do Pagar.me ───────────────────────────────────────────────
export class PagarmeError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function pagarmeRequest<T = Record<string, any>>(config: StoredConfig, method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  if (!config.secretKeyEnc) throw new PagarmeError("O Pagar.me ainda não foi configurado.", 0);
  const secret = decryptSecret(config.secretKeyEnc);
  const response = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* resposta sem JSON */ }
  if (!response.ok) {
    const detail = json?.message ?? (json?.errors ? JSON.stringify(json.errors).slice(0, 300) : `HTTP ${response.status}`);
    throw new PagarmeError(`Pagar.me recusou a chamada: ${detail}`, response.status);
  }
  return json as T;
}

export async function testPagarmeConnection(): Promise<{ ok: boolean; message: string; environment: string }> {
  const config = await loadPagarmeConfig();
  const environment = environmentOf(config.baseUrl);
  if (!config.secretKeyEnc) return { ok: false, message: "Informe e salve a chave secreta antes de testar.", environment };
  try {
    await pagarmeRequest(config, "GET", "/plans?page=1&size=1");
    const secret = decryptSecret(config.secretKeyEnc);
    const keyMode = secret.startsWith("sk_test_") ? "teste" : secret.startsWith("sk_live_") ? "produção" : "";
    const mismatch = (environment === "teste" && keyMode === "produção") || (environment === "producao" && keyMode === "teste");
    return mismatch
      ? { ok: false, message: `A chave é de ${keyMode}, mas o endereço está em ${environment === "teste" ? "teste" : "produção"}. Ajuste um dos dois.`, environment }
      : { ok: true, message: `Conectado ao Pagar.me (${environment}).`, environment };
  } catch (error) {
    if (error instanceof PagarmeError && (error.status === 401 || error.status === 403)) return { ok: false, message: "O Pagar.me recusou a chave secreta. Confira se ela é desta conta e deste ambiente.", environment };
    return { ok: false, message: error instanceof Error ? error.message : "Falha ao conectar.", environment };
  }
}

// ─── Estado, checkout e confirmação ───────────────────────────────────────────
export async function getChurchBilling(churchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [church] = await db.select().from(churches).where(eq(churches.id, churchId)).limit(1);
  if (!church) throw new Error("Igreja não encontrada.");
  const state = computeBillingState({ createdAt: church.createdAt, paidUntil: church.paidUntil ?? null });
  return { church, state };
}

export async function listChurchPayments(churchId: number, limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(platformPayments).where(eq(platformPayments.churchId, churchId)).orderBy(desc(platformPayments.createdAt)).limit(limit);
}

function checkoutName(plan: BillingPlanKey, cycle: BillingCycle) {
  return `Ide Fazei ${BILLING_PLANS[plan].name} ${cycle}`.slice(0, 64);
}

export async function startChurchCheckout(input: { churchId: number; plan: BillingPlanKey; cycle: BillingCycle; mode: BillingMode; requestedBy: string }) {
  const config = await loadPagarmeConfig();
  if (!config.secretKeyEnc) throw new Error("O pagamento on-line ainda não está disponível. Fale com o suporte do Ide Fazei.");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { church } = await getChurchBilling(input.churchId);
  const amountCents = billingAmountCents(input.plan, input.cycle);
  const [inserted] = await db.insert(platformPayments).values({
    churchId: church.id, mode: input.mode, planKey: input.plan, cycle: input.cycle, amountCents, status: "pendente", createdBy: input.requestedBy.slice(0, 160),
  });
  const paymentId = (inserted as { insertId?: number }).insertId;
  if (!paymentId) throw new Error("Não foi possível registrar a cobrança.");
  const origin = church.slug ? `https://${church.slug}.idefazei.com.br` : ENV.publicAppUrl;
  const customer: Record<string, unknown> = { name: church.name.slice(0, 64), code: `${CUSTOMER_REFERENCE_PREFIX}${church.id}` };
  if (church.email) customer.email = church.email;
  const common = {
    name: checkoutName(input.plan, input.cycle),
    customer_settings: { customer },
    flow_settings: { success_url: `${origin}/app/assinatura?pagamento=ok` },
  };
  try {
    let body: Record<string, unknown>;
    if (input.mode === "pontual") {
      body = {
        ...common,
        type: "order",
        order_code: `${PAYMENT_REFERENCE_PREFIX}${paymentId}`,
        expires_in: 60 * 24 * 3,
        payment_settings: { accepted_payment_methods: ["credit_card", "pix", "boleto"], statement_descriptor: "IDEFAZEI" },
        cart_settings: { items: [{ name: checkoutName(input.plan, input.cycle), description: `Acesso ao Ide Fazei por ${billingCycleMonths(input.cycle)} ${billingCycleMonths(input.cycle) === 1 ? "mês" : "meses"}`, amount: amountCents, default_quantity: 1 }] },
      };
    } else {
      const planId = await ensureRecurringPlan(config, input.plan, input.cycle);
      body = {
        ...common,
        type: "subscription",
        payment_settings: { accepted_payment_methods: ["credit_card", "boleto"] },
        cart_settings: { recurrences: [{ plan_id: planId, start_in: 1 }] },
      };
    }
    const link = await pagarmeRequest<{ id: string; url: string }>(config, "POST", "/paymentlinks", body);
    await db.update(platformPayments).set({ pagarmeLinkId: link.id, pagarmeLinkUrl: link.url }).where(eq(platformPayments.id, paymentId));
    return { url: link.url, paymentId };
  } catch (error) {
    await db.update(platformPayments).set({ status: "falhou", note: (error instanceof Error ? error.message : "erro").slice(0, 250) }).where(eq(platformPayments.id, paymentId));
    throw error;
  }
}

async function ensureRecurringPlan(config: StoredConfig, plan: BillingPlanKey, cycle: BillingCycle): Promise<string> {
  const key = `${plan}:${cycle}`;
  if (config.planIds[key]) return config.planIds[key];
  const created = await pagarmeRequest<{ id: string }>(config, "POST", "/plans", {
    name: checkoutName(plan, cycle),
    currency: "BRL",
    interval: cycle === "anual" ? "year" : "month",
    interval_count: 1,
    billing_type: "prepaid",
    payment_methods: ["credit_card", "boleto"],
    items: [{ name: `Assinatura ${BILLING_PLANS[plan].name} ${cycle}`.slice(0, 64), quantity: 1, pricing_scheme: { price: billingAmountCents(plan, cycle) } }],
  });
  const fresh = await loadPagarmeConfig();
  fresh.planIds = { ...fresh.planIds, [key]: created.id };
  await persistPagarmeConfig(fresh, "sistema");
  return created.id;
}

/** Aplica um pagamento confirmado: soma a vigência da igreja e registra a cobrança (uma vez por cobrança do Pagar.me). */
export async function applyPaidCharge(input: { churchId: number; plan: BillingPlanKey; cycle: BillingCycle; mode: BillingMode | "manual"; amountCents: number; chargeId: string | null; paymentRowId?: number; method?: string | null; subscriptionId?: string | null; note?: string; createdBy?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (input.chargeId) {
    const [already] = await db.select({ id: platformPayments.id, status: platformPayments.status }).from(platformPayments).where(eq(platformPayments.pagarmeChargeId, input.chargeId)).limit(1);
    if (already?.status === "pago") return { applied: false as const };
  }
  const { church } = await getChurchBilling(input.churchId);
  const paidUntil = extendPaidUntil(church.paidUntil ?? null, billingCycleMonths(input.cycle));
  const values = {
    status: "pago" as const, planKey: input.plan, cycle: input.cycle, amountCents: input.amountCents, pagarmeChargeId: input.chargeId,
    paymentMethod: input.method ?? null, paidAt: new Date(), periodEnd: paidUntil,
  };
  if (input.paymentRowId) {
    await db.update(platformPayments).set(values).where(and(eq(platformPayments.id, input.paymentRowId), eq(platformPayments.churchId, input.churchId)));
  } else {
    await db.insert(platformPayments).values({ churchId: input.churchId, mode: input.mode, note: input.note?.slice(0, 250) ?? null, createdBy: input.createdBy?.slice(0, 160) ?? null, ...values });
  }
  await db.update(churches).set({ paidUntil, billingPlan: input.plan, ...(input.subscriptionId ? { pagarmeSubscriptionId: input.subscriptionId } : {}) }).where(eq(churches.id, input.churchId));
  return { applied: true as const, paidUntil };
}

export async function listAllPayments(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ payment: platformPayments, churchName: churches.name, churchSlug: churches.slug }).from(platformPayments).leftJoin(churches, eq(churches.id, platformPayments.churchId)).orderBy(desc(platformPayments.createdAt)).limit(limit);
}
