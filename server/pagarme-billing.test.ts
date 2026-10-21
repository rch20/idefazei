import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BILLING_ROLLOUT_AT,
  GRACE_DAYS,
  TRIAL_DAYS,
  addMonths,
  billingAmountCents,
  computeBillingState,
  extendPaidUntil,
  trialEndsAtFor,
} from "../shared/billing";
import { decryptSecret, encryptSecret, maskSecret, normalizePagarmeBaseUrl, webhookTokenMatches } from "./billing";

const read = (path: string) => readFileSync(resolve(import.meta.dirname, "..", path), "utf8");
const day = 24 * 60 * 60 * 1000;

describe("regras de teste, vencimento e carência", () => {
  it("usa 30 dias de teste e 7 de carência", () => {
    expect(TRIAL_DAYS).toBe(30);
    expect(GRACE_DAYS).toBe(7);
  });

  it("igrejas antigas ganham o teste a partir da data de lançamento, as novas a partir da criação", () => {
    const rollout = new Date(BILLING_ROLLOUT_AT).getTime();
    expect(trialEndsAtFor(new Date("2024-01-01T00:00:00Z")).getTime()).toBe(rollout + 30 * day);
    const later = new Date(rollout + 10 * day);
    expect(trialEndsAtFor(later).getTime()).toBe(later.getTime() + 30 * day);
  });

  it("percorre teste → carência → vencida", () => {
    const createdAt = new Date(new Date(BILLING_ROLLOUT_AT).getTime() + day);
    const at = (days: number) => computeBillingState({ createdAt, paidUntil: null, now: new Date(createdAt.getTime() + days * day) }).phase;
    expect(at(1)).toBe("teste");
    expect(at(29)).toBe("teste");
    expect(at(31)).toBe("carencia");
    expect(at(36)).toBe("carencia");
    expect(at(38)).toBe("vencida");
  });

  it("o pagamento vale mais que o teste e depois também tem carência", () => {
    const createdAt = new Date(new Date(BILLING_ROLLOUT_AT).getTime() + day);
    const paidUntil = new Date(createdAt.getTime() + 60 * day);
    const state = (days: number) => computeBillingState({ createdAt, paidUntil, now: new Date(createdAt.getTime() + days * day) });
    expect(state(45).phase).toBe("ativa");
    expect(state(61).phase).toBe("carencia");
    expect(state(68).phase).toBe("vencida");
  });

  it("soma o período a partir do fim atual quando ainda vigente, ou de hoje quando vencida", () => {
    const now = new Date("2026-11-10T12:00:00Z");
    expect(extendPaidUntil(new Date("2026-11-20T12:00:00Z"), 1, now).toISOString()).toBe("2026-12-20T12:00:00.000Z");
    expect(extendPaidUntil(new Date("2026-10-01T12:00:00Z"), 1, now).toISOString()).toBe("2026-12-10T12:00:00.000Z");
    expect(extendPaidUntil(null, 12, now).toISOString()).toBe("2027-11-10T12:00:00.000Z");
    expect(addMonths(new Date("2026-01-31T00:00:00Z"), 1).toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });

  it("calcula os valores em centavos", () => {
    expect(billingAmountCents("basico", "mensal")).toBe(9700);
    expect(billingAmountCents("basico", "anual")).toBe(7700 * 12);
    expect(billingAmountCents("enterprise", "mensal")).toBe(49700);
  });
});

describe("configuração segura do Pagar.me", () => {
  it("criptografa a chave secreta e só mostra a máscara", () => {
    process.env.JWT_SECRET ??= "teste-jwt";
    const secret = "sk_test_abcdefghijklmnop1234";
    const stored = encryptSecret(secret);
    expect(stored).not.toContain("sk_test");
    expect(decryptSecret(stored)).toBe(secret);
    expect(maskSecret(secret)).toBe("sk_test_••••1234");
  });

  it("só aceita endereços HTTPS do Pagar.me", () => {
    expect(normalizePagarmeBaseUrl("https://sdx-api.pagar.me/core/v5/")).toBe("https://sdx-api.pagar.me/core/v5");
    expect(() => normalizePagarmeBaseUrl("http://api.pagar.me/core/v5")).toThrow();
    expect(() => normalizePagarmeBaseUrl("https://evil.example.com/core/v5")).toThrow();
    expect(() => normalizePagarmeBaseUrl("https://api.pagar.me.evil.com/core/v5")).toThrow();
  });

  it("compara o código do webhook sem aceitar vazio", () => {
    expect(webhookTokenMatches("abc", "abc")).toBe(true);
    expect(webhookTokenMatches("abd", "abc")).toBe(false);
    expect(webhookTokenMatches("", "")).toBe(false);
  });
});

describe("integração Pagar.me", () => {
  it("implementa cobrança pontual e recorrente com os endpoints da documentação", () => {
    const billing = read("server/billing.ts");
    expect(billing).toContain('"/paymentlinks"');
    expect(billing).toContain('type: "order"');
    expect(billing).toContain('type: "subscription"');
    expect(billing).toContain('"/plans"');
    expect(billing).toContain('"credit_card", "pix", "boleto"');
    expect(billing).toContain('accepted_payment_methods: ["credit_card", "boleto"]');
    expect(billing).toContain("order_code");
    expect(billing).toContain('"User-Agent": USER_AGENT');
  });

  it("confirma o pagamento consultando a cobrança na API, não o corpo do webhook", () => {
    const webhook = read("server/pagarme-webhook.ts");
    expect(webhook).toContain("`/charges/${encodeURIComponent(id)}`");
    expect(webhook).toContain('charge?.status === "paid"');
    expect(webhook).toContain("webhookTokenMatches");
    expect(read("server/_core/index.ts")).toContain('"/api/webhooks/pagarme/:token"');
  });

  it("restringe quem configura e quem paga", () => {
    const routers = read("server/routers.ts");
    const block = routers.slice(routers.indexOf("const billingRouter"), routers.indexOf("// ─── STRIPE ROUTER"));
    expect(block).toContain("config: adminProcedure");
    expect(block).toContain("saveConfig: adminProcedure");
    expect(block).toContain("testConnection: adminProcedure");
    expect(block).toContain("grant: adminProcedure");
    expect(block).toContain("await requirePastor(ctx.user.id, input.churchId);");
  });

  it("registra a migration aditiva no ledger e deixa o bloqueio desligado por padrão", () => {
    const sql = read("drizzle/0106_platform_billing.sql");
    expect(sql.replaceAll("ON UPDATE CURRENT_TIMESTAMP", "")).not.toMatch(/\b(DROP|DELETE|UPDATE|TRUNCATE)\b/i);
    const entry = JSON.parse(read("drizzle/custom-migrations.json")).entries.find((item: { id: string }) => item.id === "0106");
    expect(entry.sha256).toBe(createHash("sha256").update(sql).digest("hex"));
    expect(read("server/billing.ts")).toContain("enforce: false");
  });

  it("mostra Assinatura ao administrador e Pagamentos no Super Admin", () => {
    expect(read("client/src/components/ChurchLayout.tsx")).toContain('label: "Assinatura", path: "/app/assinatura", group: "admin", accessKey: "canManageChurch"');
    expect(read("client/src/App.tsx")).toContain('<Route path="/app/assinatura">');
    expect(read("client/src/pages/AdminPanel.tsx")).toContain('{ id: "payments", label: "Pagamentos"');
    expect(read("client/src/components/PlatformBillingSettings.tsx")).toContain("Testar conexão");
  });
});
