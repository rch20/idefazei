import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { authenticator } from "otplib";
import {
  encryptTotpSecret,
  decryptTotpSecret,
  generateTotpSecret,
  verifyTotp,
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode,
} from "./treasury2fa";

// A cripto lê ENV.cookieSecret || process.env.JWT_SECRET em tempo de chamada.
beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "teste-2fa-segredo-para-unit";
});

const read = (p: string) => readFileSync(resolve(import.meta.dirname, "..", p), "utf8");

describe("2FA da tesouraria — segredo TOTP", () => {
  it("cifra e decifra o segredo (round-trip) no formato v1 GCM", () => {
    const secret = generateTotpSecret();
    const enc = encryptTotpSecret(secret);
    expect(enc.startsWith("v1:")).toBe(true);
    expect(enc.split(":")).toHaveLength(4);
    expect(enc).not.toContain(secret); // nunca em claro
    expect(decryptTotpSecret(enc)).toBe(secret);
  });

  it("rejeita um texto cifrado adulterado (tag GCM)", () => {
    const enc = encryptTotpSecret("ABC123");
    const parts = enc.split(":");
    parts[3] = Buffer.from("adulterado").toString("base64");
    expect(() => decryptTotpSecret(parts.join(":"))).toThrow();
  });

  it("verifica o código TOTP do app e rejeita inválidos", () => {
    const secret = generateTotpSecret();
    const token = authenticator.generate(secret);
    expect(verifyTotp(token, secret)).toBe(true);
    expect(verifyTotp("000000", secret)).toBe(false);
    expect(verifyTotp("12345", secret)).toBe(false); // menos de 6 dígitos
    expect(verifyTotp("abcdef", secret)).toBe(false);
  });
});

describe("2FA da tesouraria — códigos de recuperação", () => {
  it("gera 10 códigos no formato legível, sem caracteres ambíguos", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    for (const c of codes) {
      expect(c).toMatch(/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
      expect(c).not.toMatch(/[O0I1L]/);
    }
    expect(new Set(codes).size).toBe(10); // sem repetição
  });

  it("hash é determinístico, insensível a caixa/hífen e distinto por código", () => {
    const [a, b] = generateRecoveryCodes();
    expect(hashRecoveryCode(a)).toBe(hashRecoveryCode(a));
    expect(hashRecoveryCode(a.toLowerCase())).toBe(hashRecoveryCode(a));
    expect(hashRecoveryCode(a.replace("-", ""))).toBe(hashRecoveryCode(a));
    expect(hashRecoveryCode(a)).not.toBe(hashRecoveryCode(b));
    expect(normalizeRecoveryCode(" a-b c ")).toBe("ABC");
  });
});

describe("2FA da tesouraria — invariantes do guard (fonte)", () => {
  const routers = read("server/routers.ts");

  it("requireTreasuryAccess exige 2FA na sessão e sinaliza TREASURY_2FA_REQUIRED", () => {
    const start = routers.indexOf("async function requireTreasuryAccess(");
    const fn = routers.slice(start, routers.indexOf("\n}", start) + 2);
    expect(fn).toContain("hasValidTreasurySession");
    expect(fn).toContain("TREASURY_2FA_REQUIRED");
  });

  it("isenta o salão demo da trava (vitrine)", () => {
    const start = routers.indexOf("async function requireTreasuryAccess(");
    const fn = routers.slice(start, routers.indexOf("\n}", start) + 2);
    expect(fn).toContain("isDemoChurch(churchId)");
  });

  it("as rotas de 2FA usam o helper só-de-papel (sem impasse de 2FA para configurar o 2FA)", () => {
    expect(routers).toContain("twoFactorBeginEnroll");
    expect(routers).toContain("twoFactorConfirmEnroll");
    expect(routers).toContain("twoFactorVerify");
    // o status usa requireTreasuryRole (não o requireTreasuryAccess com trava)
    const status = routers.slice(routers.indexOf("twoFactorStatus:"), routers.indexOf("twoFactorBeginEnroll:"));
    expect(status).toContain("requireTreasuryRole(ctx.user.id, input.churchId)");
  });
});
