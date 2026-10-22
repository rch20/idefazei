/**
 * Autenticação própria da plataforma (sem Manus OAuth)
 * - church_users: usuários das igrejas (email + senha + perfil)
 * - super_admins: administradores da plataforma SaaS
 */

import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./_core/env";
import { getChurchById, getDb } from "./db";
import { churchUsers, people, superAdmins, superAdminBootstrap } from "../drizzle/schema";
import { and, eq, or, sql } from "drizzle-orm";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

// Em produção a assinatura dos tokens exige um segredo próprio: sem ele qualquer pessoa conseguiria forjar sessões.
if (ENV.isProduction && !ENV.cookieSecret) {
  throw new Error("JWT_SECRET ausente em produção: o servidor não pode iniciar sem o segredo de sessão.");
}
const JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret || "fallback-secret-change-me");
const TOKEN_EXPIRY = "7d";

// Senhas: scrypt com sal único por usuário. O formato antigo (SHA-256 com sal fixo) ainda é aceito
// no login e trocado pelo novo na mesma hora (ver passwordNeedsRehash).
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_PREFIX = "scrypt$";

function scryptKey(password: string, salt: Buffer, n: number, r: number, p: number) {
  return scryptSync(password.normalize("NFKC"), salt, SCRYPT_KEYLEN, { N: n, r, p, maxmem: 128 * n * r * 2 });
}

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptKey(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return `${SCRYPT_PREFIX}${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

function legacySha256(password: string): string {
  return createHash("sha256").update(password + "lampas-salt-2025").digest("hex");
}

function safeEqual(left: Buffer, right: Buffer) {
  return left.length === right.length && timingSafeEqual(left, right);
}

function verifyPassword(password: string, hash: string): boolean {
  if (hash.startsWith(SCRYPT_PREFIX)) {
    const [, n, r, p, salt, key] = hash.split("$");
    if (!n || !r || !p || !salt || !key) return false;
    try {
      const expected = Buffer.from(key, "base64");
      return safeEqual(scryptKey(password, Buffer.from(salt, "base64"), Number(n), Number(r), Number(p)), expected);
    } catch {
      return false;
    }
  }
  return safeEqual(Buffer.from(legacySha256(password)), Buffer.from(hash));
}

/** Hashes no formato antigo são trocados pelo novo no próximo login bem-sucedido. */
export function passwordNeedsRehash(hash: string): boolean {
  return !hash.startsWith(SCRYPT_PREFIX);
}

export type ChurchTokenPayload = {
  sub: string; // churchUser.id
  churchId: number;
  role: string;
  type: "church";
};

export type AdminTokenPayload = {
  sub: string; // superAdmin.id
  type: "admin";
};

export async function signToken(payload: ChurchTokenPayload | AdminTokenPayload): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<ChurchTokenPayload | AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as ChurchTokenPayload | AdminTokenPayload;
  } catch {
    return null;
  }
}

// ─── CHURCH USER AUTH ─────────────────────────────────────────────────────────

export type ChurchLoginIdentifier =
  | { kind: "email"; value: string }
  | { kind: "phone"; value: string }
  | { kind: "invalid"; value: null };

/**
 * Normaliza o único campo de login sem transformar contato em uma nova identidade.
 * O telefone/WhatsApp é resolvido nos dados da Pessoa dentro da igreja do host;
 * assim, uma alteração de contato passa a valer no login sem duplicar identidade.
 */
export function normalizeChurchLoginIdentifier(value: string): ChurchLoginIdentifier {
  const trimmed = value.trim();
  if (trimmed.includes("@")) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
      ? { kind: "email", value: trimmed.toLowerCase() }
      : { kind: "invalid", value: null };
  }

  if (!/^[+\d\s().-]+$/.test(trimmed)) return { kind: "invalid", value: null };
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15
    ? { kind: "phone", value: digits }
    : { kind: "invalid", value: null };
}

function normalizedPhoneExpression(column: any, normalizedPhone: string) {
  return sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column}, ''), '(', ''), ')', ''), '-', ''), ' ', ''), '+', ''), '.', '') = ${normalizedPhone}`;
}

export async function loginChurchUser(identifier: string, password: string, tenantChurchId?: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const normalized = normalizeChurchLoginIdentifier(identifier);
  if (normalized.kind === "invalid") return null;

  let user: typeof churchUsers.$inferSelect | undefined;
  if (normalized.kind === "email") {
    const conditions = [eq(churchUsers.email, normalized.value)];
    if (tenantChurchId) conditions.push(eq(churchUsers.churchId, tenantChurchId));
    const rows = await db.select().from(churchUsers).where(and(...conditions)).limit(1);
    user = rows[0];
  } else if (tenantChurchId) {
    const matchingPeople = await db
      .select({ id: people.id })
      .from(people)
      .where(and(
        eq(people.churchId, tenantChurchId),
        eq(people.active, true),
        or(
          normalizedPhoneExpression(people.phone, normalized.value),
          normalizedPhoneExpression(people.whatsapp, normalized.value),
        ),
      ))
      .limit(2);
    // Telefone compartilhado ou duplicado nunca escolhe uma Pessoa arbitrariamente.
    if (matchingPeople.length === 1) {
      const rows = await db
        .select()
        .from(churchUsers)
        .where(and(
          eq(churchUsers.churchId, tenantChurchId),
          eq(churchUsers.personId, matchingPeople[0].id),
        ))
        .limit(2);
      // Uma Pessoa não pode ser acessada por mais de uma conta silenciosamente.
      if (rows.length === 1) user = rows[0];
    }
  }

  if (!user || !user.active) return null;

  const church = await getChurchById(user.churchId);
  if (!church?.active) return null;

  if (!verifyPassword(password, user.passwordHash)) return null;

  if (user.emailVerificationRequired && !user.emailVerifiedAt) {
    return { kind: "email_verification_required" as const };
  }

  // Update lastLoginAt
  await db.update(churchUsers).set({ lastLoginAt: new Date(), ...(passwordNeedsRehash(user.passwordHash) ? { passwordHash: hashPassword(password) } : {}) }).where(eq(churchUsers.id, user.id));

  const token = await signToken({
    sub: String(user.id),
    churchId: user.churchId,
    role: user.role,
    type: "church",
  });

  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role, churchId: user.churchId } };
}

export async function createChurchUser(data: {
  churchId: number;
  name: string;
  email: string;
  password: string;
  role: typeof churchUsers.$inferInsert["role"];
  personId?: number;
  active?: boolean;
  registrationStatus?: "approved" | "pending" | "rejected";
  approvedAt?: Date | null;
  approvedByChurchUserId?: number | null;
  emailVerificationRequired?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const passwordHash = hashPassword(data.password);
  await db.insert(churchUsers).values({
    churchId: data.churchId,
    name: data.name,
    email: data.email.toLowerCase(),
    passwordHash,
    role: data.role ?? "membro",
    personId: data.personId ?? null,
    active: data.active ?? true,
    registrationStatus: data.registrationStatus ?? "approved",
    approvedAt: data.approvedAt ?? null,
    approvedByChurchUserId: data.approvedByChurchUserId ?? null,
    emailVerificationRequired: data.emailVerificationRequired ?? false,
  });

  const rows = await db.select().from(churchUsers).where(eq(churchUsers.email, data.email.toLowerCase())).limit(1);
  return rows[0];
}

// ─── SUPER ADMIN AUTH ─────────────────────────────────────────────────────────

export async function loginSuperAdmin(email: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const rows = await db.select().from(superAdmins).where(eq(superAdmins.email, email.toLowerCase())).limit(1);
  const admin = rows[0];
  if (!admin || !admin.active) return null;

  if (!verifyPassword(password, admin.passwordHash)) return null;
  if (passwordNeedsRehash(admin.passwordHash)) {
    await db.update(superAdmins).set({ passwordHash: hashPassword(password) }).where(eq(superAdmins.id, admin.id));
  }

  const token = await signToken({ sub: String(admin.id), type: "admin" });
  return { token, admin: { id: admin.id, name: admin.name, email: admin.email } };
}

export async function createSuperAdmin(name: string, email: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const passwordHash = hashPassword(password);
  await db.insert(superAdmins).values({ name, email: email.toLowerCase(), passwordHash });
}

function matchesSetupToken(candidate: string) {
  const configured = ENV.superAdminSetupToken;
  if (!configured || candidate.length !== configured.length) return false;
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(configured));
}

export async function isInitialSuperAdminSetupAvailable() {
  if (!ENV.superAdminSetupToken) return false;
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const configured = await db.select({ id: superAdminBootstrap.id }).from(superAdminBootstrap).limit(1);
  const admins = await db.select({ id: superAdmins.id }).from(superAdmins).limit(1);
  return configured.length === 0 && admins.length === 0;
}

export async function createInitialSuperAdmin(input: { name: string; email: string; password: string; setupToken: string }) {
  if (!matchesSetupToken(input.setupToken)) return { ok: false as const, reason: "invalid_setup_token" as const };
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  try {
    await db.transaction(async (tx) => {
      const configured = await tx.select({ id: superAdminBootstrap.id }).from(superAdminBootstrap).limit(1);
      const admins = await tx.select({ id: superAdmins.id }).from(superAdmins).limit(1);
      if (configured.length > 0 || admins.length > 0) {
        throw new Error("SUPER_ADMIN_ALREADY_CONFIGURED");
      }

      await tx.insert(superAdminBootstrap).values({ id: 1 });
      await tx.insert(superAdmins).values({
        name: input.name.trim(),
        email: input.email.toLowerCase(),
        passwordHash: hashPassword(input.password),
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SUPER_ADMIN_ALREADY_CONFIGURED") {
      return { ok: false as const, reason: "already_configured" as const };
    }
    if (String(error).toLowerCase().includes("duplicate")) {
      return { ok: false as const, reason: "already_configured" as const };
    }
    throw error;
  }

  return { ok: true as const };
}

export { hashPassword, verifyPassword };
