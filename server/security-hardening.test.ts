import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { hashPassword, passwordNeedsRehash, verifyPassword } from "./auth";
import { createLoginThrottle } from "./adminLoginThrottle";

const read = (path: string) => readFileSync(resolve(import.meta.dirname, "..", path), "utf8");

describe("senhas", () => {
  it("usa scrypt com sal único por senha", () => {
    const first = hashPassword("Senha-forte-123");
    const second = hashPassword("Senha-forte-123");
    expect(first.startsWith("scrypt$")).toBe(true);
    expect(first).not.toBe(second);
    expect(verifyPassword("Senha-forte-123", first)).toBe(true);
    expect(verifyPassword("senha-forte-123", first)).toBe(false);
    expect(passwordNeedsRehash(first)).toBe(false);
  });

  it("aceita o formato antigo no login e pede a troca por scrypt", () => {
    const legacy = createHash("sha256").update("antiga123" + "lampas-salt-2025").digest("hex");
    expect(verifyPassword("antiga123", legacy)).toBe(true);
    expect(verifyPassword("outra", legacy)).toBe(false);
    expect(passwordNeedsRehash(legacy)).toBe(true);
  });

  it("rejeita hash malformado sem lançar erro", () => {
    expect(verifyPassword("x", "scrypt$1$2")).toBe(false);
    expect(verifyPassword("x", "")).toBe(false);
  });

  it("troca o hash antigo no mesmo update do último acesso e exige segredo JWT em produção", () => {
    const auth = read("server/auth.ts");
    expect(auth).toContain("passwordNeedsRehash(user.passwordHash) ? { passwordHash: hashPassword(password) }");
    expect(auth).toContain("JWT_SECRET ausente em produção");
  });
});

describe("limite de tentativas de login das igrejas", () => {
  it("bloqueia depois de várias falhas e libera após acerto", () => {
    const throttle = createLoginThrottle({ maxPerOrigin: 3, maxPerAccount: 10 });
    for (let i = 0; i < 3; i += 1) throttle.recordFailure("1.1.1.1", "7:ana@igreja.com");
    expect(throttle.retryAfterSeconds("1.1.1.1", "7:ana@igreja.com")).toBeGreaterThan(0);
    expect(throttle.retryAfterSeconds("2.2.2.2", "7:ana@igreja.com")).toBe(0);
  });

  it("aplica o limite no login da igreja, antes de consultar a senha", () => {
    const routers = read("server/routers.ts");
    const block = routers.slice(routers.indexOf("const churchAuthRouter"), routers.indexOf("requestPasswordReset: publicProcedure"));
    expect(block).toContain("rateLimitWait(loginRules)");
    expect(block.indexOf("rateLimitWait")).toBeLessThan(block.indexOf("loginChurchUser("));
    expect(block).toContain("TOO_MANY_REQUESTS");
    expect(block).toContain("rateLimitRecordAll(loginRules)");
  });
});

describe("entradas que viram CSS, link ou imagem", () => {
  it("aceita só #RRGGBB nas cores da igreja e HTTPS na logo", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("const hexColorInput = z.string().regex(/^#[0-9a-fA-F]{6}$/");
    expect(routers.match(/primaryColor: hexColorInput\.optional\(\)/g)?.length).toBe(2);
    expect(routers).toContain('Use um endereço HTTPS para a logo.');
  });

  it("não aceita destino de botão //site-externo", () => {
    expect(read("server/routers.ts")).toContain('!value.startsWith("//")');
  });
});

describe("servidor", () => {
  it("envia cabeçalhos de segurança, sem bloquear iframes do Manus, e limita o corpo JSON", () => {
    const index = read("server/_core/index.ts");
    expect(index).toContain('"X-Content-Type-Options", "nosniff"');
    expect(index).toContain('"Referrer-Policy"');
    expect(index).not.toContain("X-Frame-Options");
    expect(index).toContain('express.json({ limit: "15mb" })');
  });
});

describe("segurança 2: limites no banco, e-mail e Super Admin", () => {
  it("guarda os contadores no banco e remove os mapas em memória", () => {
    const routers = read("server/routers.ts");
    const index = read("server/_core/index.ts");
    expect(read("server/rateLimit.ts")).toContain("rateLimitHits");
    expect(routers).not.toContain("createLoginThrottle");
    expect(routers).not.toContain("publicRegistrationAttempts");
    expect(index).not.toContain("publicDonationUploadAttempts");
  });

  it("limita pedidos que disparam e-mail e o formulário de contato", () => {
    const routers = read("server/routers.ts");
    for (const bucket of ["church-reset-ip", "church-verify-ip", "admin-reset-ip", "contact-send"]) expect(routers).toContain(bucket);
    expect(read("server/passwordRecovery.ts")).toContain("consumeMailBudget()");
    expect(read("server/emailVerification.ts")).toContain("consumeMailBudget()");
    expect(read("server/adminPasswordRecovery.ts")).toContain("consumeMailBudget()");
  });

  it("redefinição do Super Admin: resposta neutra, token em hash e uso único", () => {
    const code = read("server/adminPasswordRecovery.ts");
    expect(code).toContain("randomBytes(32)");
    expect(code).toContain("tokenHash");
    expect(code).toContain("isNull(superAdminPasswordResets.usedAt)");
    expect(read("server/routers.ts")).toContain("accepted: true");
  });

  it("não existe mais QR nem check-in de eventos", () => {
    expect(read("client/src/App.tsx")).not.toContain("CheckinEvento");
    expect(read("server/routers.ts")).not.toContain("generateQrCode");
  });

  it("confere o conteúdo real dos arquivos enviados", () => {
    expect((read("server/_core/index.ts").match(/matchesTreasuryAttachmentSignature\(/g) ?? []).length).toBeGreaterThanOrEqual(6);
  });

  it("a migração 0107 só cria tabelas", () => {
    const sql = read("drizzle/0107_rate_limits_and_admin_reset.sql");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS `rate_limit_hits`/);
    expect(sql).not.toMatch(/\b(DROP|DELETE|TRUNCATE)\b/i);
  });
});
