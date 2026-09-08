import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { and, eq, gte, isNull } from "drizzle-orm";
import { churchPasswordResetTokens, churchUsers } from "../drizzle/schema";
import { getChurchById, getChurchUserByEmail, getDb } from "./db";
import { hashPassword } from "./auth";
import { ENV } from "./_core/env";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const RESET_RATE_WINDOW_MS = 15 * 60 * 1000;
const RESET_RATE_LIMIT = 3;

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getPublicBaseUrl() {
  return ENV.publicAppUrl.replace(/\/$/, "") || "https://idefazei.com.br";
}

export function getPasswordResetMailConfig() {
  const from = ENV.mailFrom.trim().toLowerCase();
  const user = (ENV.smtpUser || from).trim();
  const password = ENV.smtpPassword.trim();
  const host = ENV.smtpHost.trim();
  const port = Number(ENV.smtpPort || 465);
  return {
    from,
    user,
    password,
    host,
    port: Number.isFinite(port) ? port : 465,
    secure: ENV.smtpSecure,
    enabled: ENV.passwordResetEmailEnabled && Boolean(from && host && user && password),
  };
}

export function getTenantResetUrl(slug: string, token: string) {
  const configuredBase = getPublicBaseUrl();
  const base = configuredBase.includes("idefazei.com.br")
    ? `https://${slug}.idefazei.com.br`
    : configuredBase;
  return `${base}/redefinir-senha?token=${encodeURIComponent(token)}`;
}

export function buildPasswordResetEmail(input: { churchName: string; resetUrl: string; recipientName: string | null }) {
  const greeting = input.recipientName?.trim() ? `Olá, ${input.recipientName.trim()}.` : "Olá.";
  const safeGreeting = escapeHtml(greeting);
  const text = `${greeting}\n\nRecebemos uma solicitação para redefinir a senha de acesso ao painel da ${input.churchName}.\n\nUse este link para criar uma nova senha:\n${input.resetUrl}\n\nO link expira em 1 hora e pode ser usado uma única vez. Se você não solicitou esta alteração, ignore este e-mail.\n\nEquipe Ide Fazei`;
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f5f0e8;padding:32px 16px;font-family:Arial,sans-serif;color:#172f4d"><main style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 8px 28px rgba(23,47,77,.08)"><p style="color:#9a7628;font-size:12px;letter-spacing:.12em;text-transform:uppercase">Ide Fazei</p><h1 style="font-size:24px;margin:0 0 16px">Redefinição de senha</h1><p>${safeGreeting}</p><p>Recebemos uma solicitação para redefinir a senha de acesso ao painel da <strong>${escapeHtml(input.churchName)}</strong>.</p><p style="margin:28px 0"><a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;background:#172f4d;color:#fff;text-decoration:none;border-radius:10px;padding:14px 20px;font-weight:700">Criar nova senha</a></p><p style="font-size:13px;color:#64748b">O link expira em 1 hora e pode ser usado uma única vez. Se você não solicitou esta alteração, ignore este e-mail.</p><p style="font-size:13px;color:#64748b">Equipe Ide Fazei</p></main></body></html>`;
  return { text, html };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

async function sendPasswordResetEmail(input: { to: string; churchName: string; resetUrl: string; recipientName: string | null }) {
  const config = getPasswordResetMailConfig();
  if (!config.enabled) {
    if (ENV.isProduction) console.error("[PasswordRecovery] SMTP não configurado; e-mail de recuperação não enviado.");
    return false;
  }
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
  });
  const content = buildPasswordResetEmail(input);
  await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: `Redefinição de senha — ${input.churchName}`,
    text: content.text,
    html: content.html,
  });
  return true;
}

export async function requestChurchPasswordReset(input: { email: string; tenantChurchId?: number | null; requestIp?: string | null }) {
  const neutralResponse = { accepted: true } as const;
  const mailConfig = getPasswordResetMailConfig();
  if (!mailConfig.enabled) {
    if (ENV.isProduction) console.error("[PasswordRecovery] Recuperação desativada até o SMTP ser configurado.");
    return neutralResponse;
  }

  const account = await getChurchUserByEmail(input.email);
  if (!account || !account.active || account.registrationStatus !== "approved") return neutralResponse;
  if (input.tenantChurchId && account.churchId !== input.tenantChurchId) return neutralResponse;

  const church = await getChurchById(account.churchId);
  if (!church?.active) return neutralResponse;
  const db = await getDb();
  if (!db) return neutralResponse;

  const windowStart = new Date(Date.now() - RESET_RATE_WINDOW_MS);
  const recent = await db.select({ id: churchPasswordResetTokens.id })
    .from(churchPasswordResetTokens)
    .where(and(eq(churchPasswordResetTokens.churchUserId, account.id), gte(churchPasswordResetTokens.createdAt, windowStart)))
    .limit(RESET_RATE_LIMIT);
  if (recent.length >= RESET_RATE_LIMIT) return neutralResponse;

  await db.delete(churchPasswordResetTokens).where(and(eq(churchPasswordResetTokens.churchUserId, account.id), isNull(churchPasswordResetTokens.usedAt)));
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  await db.insert(churchPasswordResetTokens).values({
    churchId: account.churchId,
    churchUserId: account.id,
    tokenHash,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    requestIp: input.requestIp?.slice(0, 64) || null,
  });

  const resetUrl = getTenantResetUrl(church.slug, rawToken);
  try {
    await sendPasswordResetEmail({ to: account.email, churchName: church.name, resetUrl, recipientName: account.name });
  } catch (error) {
    await db.delete(churchPasswordResetTokens).where(eq(churchPasswordResetTokens.tokenHash, tokenHash));
    console.error("[PasswordRecovery] Falha ao enviar e-mail:", error instanceof Error ? error.message : error);
  }
  return neutralResponse;
}

export async function resetChurchPassword(input: { token: string; password: string }) {
  const tokenHash = hashResetToken(input.token);
  const db = await getDb();
  if (!db) return false;
  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(churchPasswordResetTokens)
      .where(and(eq(churchPasswordResetTokens.tokenHash, tokenHash), isNull(churchPasswordResetTokens.usedAt), gte(churchPasswordResetTokens.expiresAt, new Date())))
      .limit(1);
    const resetToken = rows[0];
    if (!resetToken) return false;
    const userUpdate = await tx.update(churchUsers)
      .set({ passwordHash: hashPassword(input.password), updatedAt: new Date() })
      .where(and(eq(churchUsers.id, resetToken.churchUserId), eq(churchUsers.churchId, resetToken.churchId), eq(churchUsers.active, true)));
    if (Number((userUpdate as { affectedRows?: number }).affectedRows ?? 0) !== 1) return false;
    const tokenUpdate = await tx.update(churchPasswordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(churchPasswordResetTokens.id, resetToken.id), isNull(churchPasswordResetTokens.usedAt)));
    return Number((tokenUpdate as { affectedRows?: number }).affectedRows ?? 0) === 1;
  });
  return result;
}

export function getPasswordResetTokenTtlMinutes() {
  return RESET_TOKEN_TTL_MS / 60_000;
}
