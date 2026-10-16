import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { and, eq, gte, isNull } from "drizzle-orm";
import { churchEmailVerificationTokens, churchUsers } from "../drizzle/schema";
import { getChurchById, getDb } from "./db";
import { ENV } from "./_core/env";
import { getSmtpMailConfig } from "./passwordRecovery";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const VERIFICATION_RATE_WINDOW_MS = 15 * 60 * 1000;
const VERIFICATION_RATE_LIMIT = 3;

export class EmailVerificationDeliveryError extends Error {
  constructor() {
    super("Email verification delivery is unavailable");
    this.name = "EmailVerificationDeliveryError";
  }
}

function hashVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getPublicBaseUrl() {
  return ENV.publicAppUrl.replace(/\/$/, "") || "https://idefazei.com.br";
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

export function getTenantEmailVerificationUrl(slug: string, token: string) {
  const configuredBase = getPublicBaseUrl();
  const base = configuredBase.includes("idefazei.com.br")
    ? `https://${slug}.idefazei.com.br`
    : configuredBase;
  return `${base}/confirmar-email?token=${encodeURIComponent(token)}`;
}

export function buildEmailVerificationEmail(input: { churchName: string; confirmationUrl: string; recipientName: string | null }) {
  const greeting = input.recipientName?.trim() ? `Olá, ${input.recipientName.trim()}.` : "Olá.";
  const safeGreeting = escapeHtml(greeting);
  const safeChurchName = escapeHtml(input.churchName);
  const safeUrl = escapeHtml(input.confirmationUrl);
  const text = `${greeting}\n\nConfirme seu e-mail para ativar o acesso à plataforma da ${input.churchName}.\n\nUse este link para confirmar:\n${input.confirmationUrl}\n\nO link expira em 24 horas e pode ser usado uma única vez. Se você não realizou este cadastro, ignore este e-mail.\n\nEquipe Ide Fazei`;
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f5f0e8;padding:32px 16px;font-family:Arial,sans-serif;color:#172f4d"><main style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 8px 28px rgba(23,47,77,.08)"><p style="color:#9a7628;font-size:12px;letter-spacing:.12em;text-transform:uppercase">Ide Fazei</p><h1 style="font-size:24px;margin:0 0 16px">Confirme seu e-mail</h1><p>${safeGreeting}</p><p>Confirme seu e-mail para ativar o acesso à plataforma da <strong>${safeChurchName}</strong>.</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#172f4d;color:#fff;text-decoration:none;border-radius:10px;padding:14px 20px;font-weight:700">Confirmar e-mail</a></p><p style="font-size:13px;color:#64748b">O link expira em 24 horas e pode ser usado uma única vez. Se você não realizou este cadastro, ignore este e-mail.</p><p style="font-size:13px;color:#64748b">Equipe Ide Fazei</p></main></body></html>`;
  return { text, html };
}

export function getEmailVerificationTokenTtlHours() {
  return VERIFICATION_TOKEN_TTL_MS / (60 * 60 * 1000);
}

export function isEmailVerificationDeliveryConfigured() {
  return getSmtpMailConfig(ENV.emailVerificationEnabled).enabled;
}

async function sendEmailVerification(input: { to: string; churchName: string; confirmationUrl: string; recipientName: string | null }) {
  const config = getSmtpMailConfig(ENV.emailVerificationEnabled);
  if (!config.enabled) {
    if (ENV.isProduction) console.error("[EmailVerification] SMTP não configurado; confirmação não enviada.");
    throw new EmailVerificationDeliveryError();
  }
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
  });
  const content = buildEmailVerificationEmail(input);
  await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: `Confirme seu e-mail — ${input.churchName}`,
    text: content.text,
    html: content.html,
  });
}

export async function issueEmailVerification(input: {
  churchId: number;
  churchUserId: number;
  email: string;
  recipientName: string | null;
  requestIp?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new EmailVerificationDeliveryError();
  const church = await getChurchById(input.churchId);
  if (!church?.active) throw new EmailVerificationDeliveryError();

  const windowStart = new Date(Date.now() - VERIFICATION_RATE_WINDOW_MS);
  const recent = await db.select({ id: churchEmailVerificationTokens.id })
    .from(churchEmailVerificationTokens)
    .where(and(
      eq(churchEmailVerificationTokens.churchUserId, input.churchUserId),
      gte(churchEmailVerificationTokens.createdAt, windowStart),
    ))
    .limit(VERIFICATION_RATE_LIMIT);
  if (recent.length >= VERIFICATION_RATE_LIMIT) return { sent: false, rateLimited: true } as const;

  await db.delete(churchEmailVerificationTokens).where(and(
    eq(churchEmailVerificationTokens.churchUserId, input.churchUserId),
    isNull(churchEmailVerificationTokens.usedAt),
  ));

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashVerificationToken(rawToken);
  await db.insert(churchEmailVerificationTokens).values({
    churchId: input.churchId,
    churchUserId: input.churchUserId,
    tokenHash,
    expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    requestIp: input.requestIp?.slice(0, 64) || null,
  });

  const confirmationUrl = getTenantEmailVerificationUrl(church.slug, rawToken);
  try {
    await sendEmailVerification({
      to: input.email,
      churchName: church.name,
      confirmationUrl,
      recipientName: input.recipientName,
    });
  } catch (error) {
    await db.delete(churchEmailVerificationTokens).where(eq(churchEmailVerificationTokens.tokenHash, tokenHash));
    throw error;
  }

  await db.update(churchUsers)
    .set({ emailVerificationSentAt: new Date() })
    .where(and(eq(churchUsers.id, input.churchUserId), eq(churchUsers.churchId, input.churchId)));

  return { sent: true, rateLimited: false } as const;
}

export async function confirmEmailVerificationToken(token: string) {
  const tokenHash = hashVerificationToken(token);
  const db = await getDb();
  if (!db) return false;

  return db.transaction(async (tx) => {
    const rows = await tx.select().from(churchEmailVerificationTokens)
      .where(and(
        eq(churchEmailVerificationTokens.tokenHash, tokenHash),
        isNull(churchEmailVerificationTokens.usedAt),
        gte(churchEmailVerificationTokens.expiresAt, new Date()),
      ))
      .limit(1);
    const verificationToken = rows[0];
    if (!verificationToken) return false;

    const userUpdate = await tx.update(churchUsers)
      .set({ emailVerificationRequired: false, emailVerifiedAt: new Date(), emailVerificationSentAt: null, updatedAt: new Date() })
      .where(and(
        eq(churchUsers.id, verificationToken.churchUserId),
        eq(churchUsers.churchId, verificationToken.churchId),
        eq(churchUsers.active, true),
      ));
    if (Number((userUpdate as { affectedRows?: number }).affectedRows ?? 0) !== 1) return false;

    const tokenUpdate = await tx.update(churchEmailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(churchEmailVerificationTokens.id, verificationToken.id), isNull(churchEmailVerificationTokens.usedAt)));
    return Number((tokenUpdate as { affectedRows?: number }).affectedRows ?? 0) === 1;
  });
}
