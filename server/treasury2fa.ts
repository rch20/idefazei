// 2FA (TOTP) da Tesouraria — regra de negócio e acesso a dados. (2026-11)
//
// Por que existe: a tesouraria mexe com dinheiro, então todo acesso exige um segundo fator
// (app autenticador padrão TOTP: Google Authenticator, Authy, etc.). A trava real mora no
// servidor (requireTreasuryAccess), não só na tela.
//
// Segurança:
//  - o segredo TOTP é guardado CIFRADO (AES-256-GCM, mesmo padrão das chaves Pagar.me, com
//    namespace próprio); nunca volta ao navegador depois do cadastro.
//  - os códigos de recuperação são guardados só como HMAC (uso único); o texto puro aparece
//    uma única vez, na hora de gerar.
//  - tudo escopado por churchId (multi-salão): o 2FA de um salão nunca encosta no de outro.
import { createHash, createCipheriv, createDecipheriv, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { authenticator } from "otplib";
import { and, eq, isNull, sql } from "drizzle-orm";
import { treasuryTwoFactor, treasuryTwoFactorRecovery, treasuryTwoFactorAudit } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getDb } from "./db";

export const TWO_FACTOR_ISSUER = "Ide Fazei — Tesouraria";
// Janela em que o 2FA conferido vale sem pedir de novo ("uma vez por sessão"). 12h = um dia de trabalho.
export const SESSION_WINDOW_MS = 12 * 60 * 60 * 1000;
// Janela "fresca" exigida em operações sensíveis (estorno, config. de pagamento).
export const FRESH_WINDOW_MS = 5 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const RECOVERY_CODE_COUNT = 10;
// Alfabeto sem caracteres ambíguos (0/O, 1/I/L) para os códigos de recuperação.
const RECOVERY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

authenticator.options = { window: 1 }; // tolera ±1 passo (30s) de diferença de relógio

// ─── Criptografia do segredo TOTP ────────────────────────────────────────────
function secretKey() {
  const secret = ENV.cookieSecret || process.env.JWT_SECRET || "";
  if (!secret) throw new Error("JWT_SECRET ausente: não é possível guardar o segredo 2FA com segurança.");
  return createHash("sha256").update(`treasury-2fa:${secret}`).digest();
}

function recoveryKey() {
  const secret = ENV.cookieSecret || process.env.JWT_SECRET || "";
  if (!secret) throw new Error("JWT_SECRET ausente: não é possível guardar os códigos de recuperação.");
  return createHash("sha256").update(`treasury-2fa-recovery:${secret}`).digest();
}

export function encryptTotpSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), body.toString("base64")].join(":");
}

export function decryptTotpSecret(stored: string): string {
  const [version, iv, tag, body] = stored.split(":");
  if (version !== "v1" || !iv || !tag || !body) throw new Error("Formato de segredo 2FA inválido.");
  const decipher = createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(iv, "base64"), { authTagLength: 16 });
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]).toString("utf8");
}

// ─── TOTP ─────────────────────────────────────────────────────────────────────
export function generateTotpSecret(): string {
  return authenticator.generateSecret(); // base32
}

export function totpKeyUri(accountLabel: string, secret: string): string {
  return authenticator.keyuri(accountLabel, TWO_FACTOR_ISSUER, secret);
}

export function verifyTotp(token: string, secret: string): boolean {
  const normalized = (token || "").replace(/\D/g, "");
  if (normalized.length !== 6) return false;
  try {
    return authenticator.verify({ token: normalized, secret });
  } catch {
    return false;
  }
}

// ─── Códigos de recuperação ─────────────────────────────────────────────────
export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    let raw = "";
    for (let c = 0; c < 10; c++) raw += RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)];
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

export function normalizeRecoveryCode(code: string): string {
  return (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashRecoveryCode(code: string): string {
  return createHmac("sha256", recoveryKey()).update(normalizeRecoveryCode(code)).digest("hex");
}

function constantTimeEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// ─── Acesso a dados (sempre escopado por churchId) ────────────────────────────
export async function getTwoFactorRecord(churchId: number, churchUserId: number) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(treasuryTwoFactor)
    .where(and(eq(treasuryTwoFactor.churchId, churchId), eq(treasuryTwoFactor.churchUserId, churchUserId)))
    .limit(1);
  return rows[0] ?? null;
}

export type TwoFactorStatus = {
  enrolled: boolean;
  sessionVerified: boolean;
  lockedUntil: Date | null;
};

export async function getTwoFactorStatus(churchId: number, churchUserId: number): Promise<TwoFactorStatus> {
  const rec = await getTwoFactorRecord(churchId, churchUserId);
  const now = Date.now();
  const enrolled = Boolean(rec && rec.enrolledAt && !rec.disabledAt);
  const sessionVerified = Boolean(
    enrolled && rec?.sessionVerifiedUntil && rec.sessionVerifiedUntil.getTime() > now,
  );
  const lockedUntil = rec?.lockedUntil && rec.lockedUntil.getTime() > now ? rec.lockedUntil : null;
  return { enrolled, sessionVerified, lockedUntil };
}

// Sessão válida = cadastrado, não desativado e dentro da janela de verificação.
export async function hasValidTreasurySession(churchId: number, churchUserId: number): Promise<boolean> {
  const status = await getTwoFactorStatus(churchId, churchUserId);
  return status.enrolled && status.sessionVerified;
}

// Verificação "fresca" (para operações sensíveis): conferiu há pouco tempo.
export async function hasFreshTreasuryVerification(churchId: number, churchUserId: number): Promise<boolean> {
  const rec = await getTwoFactorRecord(churchId, churchUserId);
  if (!rec || !rec.enrolledAt || rec.disabledAt) return false;
  return Boolean(rec.lastVerifiedAt && Date.now() - rec.lastVerifiedAt.getTime() <= FRESH_WINDOW_MS);
}

// Guarda (ou substitui) um cadastro pendente: segredo cifrado, ainda não confirmado.
export async function startEnrollment(churchId: number, churchUserId: number, secretPlain: string) {
  const db = await getDb();
  const secretCipher = encryptTotpSecret(secretPlain);
  await db
    .insert(treasuryTwoFactor)
    .values({ churchId, churchUserId, secretCipher })
    .onDuplicateKeyUpdate({
      set: {
        secretCipher,
        enrolledAt: null,
        sessionVerifiedUntil: null,
        lastVerifiedAt: null,
        failedAttempts: 0,
        lockedUntil: null,
        disabledAt: null,
      },
    });
}

// Confirma o cadastro (primeiro código válido) e já abre a sessão. Gera os códigos de recuperação.
export async function confirmEnrollment(churchId: number, churchUserId: number): Promise<string[]> {
  const db = await getDb();
  const now = new Date();
  await db
    .update(treasuryTwoFactor)
    .set({
      enrolledAt: now,
      lastVerifiedAt: now,
      sessionVerifiedUntil: new Date(now.getTime() + SESSION_WINDOW_MS),
      failedAttempts: 0,
      lockedUntil: null,
      disabledAt: null,
    })
    .where(and(eq(treasuryTwoFactor.churchId, churchId), eq(treasuryTwoFactor.churchUserId, churchUserId)));
  return regenerateRecoveryCodes(churchId, churchUserId);
}

export async function regenerateRecoveryCodes(churchId: number, churchUserId: number): Promise<string[]> {
  const db = await getDb();
  await db
    .delete(treasuryTwoFactorRecovery)
    .where(and(eq(treasuryTwoFactorRecovery.churchId, churchId), eq(treasuryTwoFactorRecovery.churchUserId, churchUserId)));
  const codes = generateRecoveryCodes();
  await db.insert(treasuryTwoFactorRecovery).values(
    codes.map((code) => ({ churchId, churchUserId, codeHash: hashRecoveryCode(code) })),
  );
  return codes;
}

// Marca a sessão como verificada; zera tentativas.
export async function markSessionVerified(churchId: number, churchUserId: number) {
  const db = await getDb();
  const now = new Date();
  await db
    .update(treasuryTwoFactor)
    .set({
      lastVerifiedAt: now,
      sessionVerifiedUntil: new Date(now.getTime() + SESSION_WINDOW_MS),
      failedAttempts: 0,
      lockedUntil: null,
    })
    .where(and(eq(treasuryTwoFactor.churchId, churchId), eq(treasuryTwoFactor.churchUserId, churchUserId)));
}

// Registra uma falha; bloqueia por alguns minutos ao passar do limite. Retorna se ficou bloqueado.
export async function registerFailedAttempt(churchId: number, churchUserId: number): Promise<{ locked: boolean }> {
  const db = await getDb();
  const rec = await getTwoFactorRecord(churchId, churchUserId);
  const attempts = (rec?.failedAttempts ?? 0) + 1;
  const locked = attempts >= MAX_FAILED_ATTEMPTS;
  await db
    .update(treasuryTwoFactor)
    .set({
      failedAttempts: locked ? 0 : attempts,
      lockedUntil: locked ? new Date(Date.now() + LOCK_MS) : rec?.lockedUntil ?? null,
    })
    .where(and(eq(treasuryTwoFactor.churchId, churchId), eq(treasuryTwoFactor.churchUserId, churchUserId)));
  return { locked };
}

// Consome um código de recuperação (uso único). Retorna true se válido e não usado.
export async function consumeRecoveryCode(churchId: number, churchUserId: number, code: string): Promise<boolean> {
  const db = await getDb();
  const hash = hashRecoveryCode(code);
  const rows = await db
    .select()
    .from(treasuryTwoFactorRecovery)
    .where(
      and(
        eq(treasuryTwoFactorRecovery.churchId, churchId),
        eq(treasuryTwoFactorRecovery.churchUserId, churchUserId),
        isNull(treasuryTwoFactorRecovery.usedAt),
      ),
    );
  const match = rows.find((row) => constantTimeEquals(row.codeHash, hash));
  if (!match) return false;
  // marca como usado só se ainda não foi (corrida): condição usedAt IS NULL
  const res = await db
    .update(treasuryTwoFactorRecovery)
    .set({ usedAt: new Date() })
    .where(and(eq(treasuryTwoFactorRecovery.id, match.id), isNull(treasuryTwoFactorRecovery.usedAt)));
  // mysql2 retorna affectedRows; se 0, outra requisição consumiu primeiro
  const affected = (res as unknown as { rowsAffected?: number; affectedRows?: number })?.rowsAffected
    ?? (Array.isArray(res) ? (res[0] as { affectedRows?: number })?.affectedRows : undefined)
    ?? 1;
  return affected > 0;
}

export async function countUnusedRecoveryCodes(churchId: number, churchUserId: number): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(treasuryTwoFactorRecovery)
    .where(
      and(
        eq(treasuryTwoFactorRecovery.churchId, churchId),
        eq(treasuryTwoFactorRecovery.churchUserId, churchUserId),
        isNull(treasuryTwoFactorRecovery.usedAt),
      ),
    );
  return Number(rows[0]?.n ?? 0);
}

// Reset (feito por um pastor/admin do salão): remove o 2FA do usuário para ele recadastrar.
export async function resetTwoFactor(churchId: number, churchUserId: number) {
  const db = await getDb();
  await db
    .delete(treasuryTwoFactorRecovery)
    .where(and(eq(treasuryTwoFactorRecovery.churchId, churchId), eq(treasuryTwoFactorRecovery.churchUserId, churchUserId)));
  await db
    .delete(treasuryTwoFactor)
    .where(and(eq(treasuryTwoFactor.churchId, churchId), eq(treasuryTwoFactor.churchUserId, churchUserId)));
}

export type TwoFactorAuditAction =
  | "ativado"
  | "verificado"
  | "falha_verificacao"
  | "recuperacao_usada"
  | "codigos_regerados"
  | "resetado"
  | "desativado"
  | "bloqueado";

export async function auditTwoFactor(
  churchId: number,
  churchUserId: number,
  action: TwoFactorAuditAction,
  actorChurchUserId?: number | null,
  detail?: string | null,
) {
  const db = await getDb();
  await db.insert(treasuryTwoFactorAudit).values({
    churchId,
    churchUserId,
    actorChurchUserId: actorChurchUserId ?? null,
    action,
    detail: detail ?? null,
  });
}
