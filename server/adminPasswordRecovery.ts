import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { and, eq, isNull } from "drizzle-orm";
import { platformSettings, superAdminPasswordResets, superAdmins } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { hashPassword } from "./auth";
import { getDb } from "./db";
import { resolveMailConfig } from "./mailSettings";
import { consumeMailBudget, rateLimitCount } from "./rateLimit";

const RECOVERY_SETTING_KEY = "admin_recovery";
const TOKEN_TTL_MS = 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const esc = (v: string) => v.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/** E-mail global que recebe o link de redefinição do Super Admin (guardado em platform_settings). */
export async function getAdminRecoveryEmail(): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select({ value: platformSettings.settingValue }).from(platformSettings).where(eq(platformSettings.settingKey, RECOVERY_SETTING_KEY)).limit(1);
  if (!row?.value) return null;
  try {
    const email = String((JSON.parse(row.value) as { email?: string }).email ?? "").trim().toLowerCase();
    return EMAIL_RE.test(email) ? email : null;
  } catch {
    return null;
  }
}

export async function saveAdminRecoveryEmail(email: string, updatedBy: string) {
  const normalized = email.trim().toLowerCase();
  if (normalized && !EMAIL_RE.test(normalized)) throw new Error("E-mail inválido.");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const value = JSON.stringify({ email: normalized });
  await db.insert(platformSettings).values({ settingKey: RECOVERY_SETTING_KEY, settingValue: value, updatedBy: updatedBy.slice(0, 160) })
    .onDuplicateKeyUpdate({ set: { settingValue: value, updatedBy: updatedBy.slice(0, 160) } });
}

export function getAdminResetUrl(token: string) {
  const base = (ENV.publicAppUrl || "https://idefazei.com.br").replace(/\/$/, "");
  const origin = base.includes("idefazei.com.br") ? "https://admin.idefazei.com.br" : base;
  return `${origin}/admin/redefinir-senha?token=${encodeURIComponent(token)}`;
}

export function buildAdminResetEmail(resetUrl: string) {
  const text = `Recebemos um pedido para redefinir a senha do Super Admin do Ide Fazei.\n\nCrie a nova senha por este link:\n${resetUrl}\n\nEle expira em 1 hora e vale para um único uso. Se não foi você, ignore este e-mail.`;
  const html = `<!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;color:#172f4d;padding:24px"><h1 style="font-size:22px">Redefinição de senha do Super Admin</h1><p>Recebemos um pedido para redefinir a senha do Super Admin do Ide Fazei.</p><p><a href="${esc(resetUrl)}" style="display:inline-block;background:#172f4d;color:#fff;text-decoration:none;border-radius:10px;padding:14px 20px;font-weight:700">Criar nova senha</a></p><p style="font-size:13px;color:#64748b">Expira em 1 hora e vale para um único uso. Se não foi você, ignore este e-mail.</p></body></html>`;
  return { text, html };
}

/** Resposta sempre neutra: não revela se o e-mail é de um Super Admin. */
export async function requestAdminPasswordReset(input: { email: string; requestIp?: string | null }) {
  const mail = await resolveMailConfig("passwordReset");
  if (!mail.enabled) {
    console.error("[AdminRecovery] SMTP não configurado; link não enviado.");
    return;
  }
  const db = await getDb();
  if (!db) return;
  const [admin] = await db.select().from(superAdmins).where(eq(superAdmins.email, input.email.trim().toLowerCase())).limit(1);
  if (!admin || !admin.active) return;
  // No máximo 3 links por hora por conta, mesmo que o pedido venha de IPs diferentes.
  const recent = await rateLimitCount("admin-reset-account", String(admin.id), 3600);
  if (recent >= 3) return;
  const recipient = (await getAdminRecoveryEmail()) ?? admin.email;
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  await db.delete(superAdminPasswordResets).where(and(eq(superAdminPasswordResets.superAdminId, admin.id), isNull(superAdminPasswordResets.usedAt)));
  await db.insert(superAdminPasswordResets).values({ superAdminId: admin.id, tokenHash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS), requestIp: input.requestIp?.slice(0, 64) || null });
  try {
    await consumeMailBudget();
    const content = buildAdminResetEmail(getAdminResetUrl(rawToken));
    await nodemailer.createTransport({ host: mail.host, port: mail.port, secure: mail.secure, auth: { user: mail.user, pass: mail.password } })
      .sendMail({ from: mail.from, to: recipient, subject: "Redefinição de senha — Super Admin Ide Fazei", text: content.text, html: content.html });
  } catch (error) {
    await db.delete(superAdminPasswordResets).where(eq(superAdminPasswordResets.tokenHash, tokenHash));
    console.error("[AdminRecovery] Falha ao enviar:", error instanceof Error ? error.message : error);
  }
}

export async function resetAdminPassword(input: { token: string; password: string }) {
  const db = await getDb();
  if (!db) return false;
  const tokenHash = hashToken(input.token);
  const [row] = await db.select().from(superAdminPasswordResets).where(eq(superAdminPasswordResets.tokenHash, tokenHash)).limit(1);
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) return false;
  // Marca como usado primeiro; só quem conseguir marcar troca a senha (evita uso duplo).
  const claim = await db.update(superAdminPasswordResets).set({ usedAt: new Date() }).where(and(eq(superAdminPasswordResets.id, row.id), isNull(superAdminPasswordResets.usedAt)));
  const affected = (claim as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0;
  if (affected < 1) return false;
  await db.update(superAdmins).set({ passwordHash: hashPassword(input.password) }).where(eq(superAdmins.id, row.superAdminId));
  return true;
}
