/**
 * Autenticação própria da plataforma (sem Manus OAuth)
 * - church_users: usuários das igrejas (email + senha + perfil)
 * - super_admins: administradores da plataforma SaaS
 */

import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./_core/env";
import { getChurchById, getDb } from "./db";
import { churchUsers, superAdmins, superAdminBootstrap } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { createHash, timingSafeEqual } from "crypto";

const JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret || "fallback-secret-change-me");
const TOKEN_EXPIRY = "7d";

// Simple hash using SHA-256 (no native bcrypt in Node without native addon)
// In production, use bcrypt via npm package
function hashPassword(password: string): string {
  return createHash("sha256").update(password + "lampas-salt-2025").digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
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

export async function loginChurchUser(email: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const rows = await db.select().from(churchUsers).where(eq(churchUsers.email, email.toLowerCase())).limit(1);
  const user = rows[0];
  if (!user || !user.active) return null;

  const church = await getChurchById(user.churchId);
  if (!church?.active) return null;

  if (!verifyPassword(password, user.passwordHash)) return null;

  // Update lastLoginAt
  await db.update(churchUsers).set({ lastLoginAt: new Date() }).where(eq(churchUsers.id, user.id));

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

export { hashPassword };
