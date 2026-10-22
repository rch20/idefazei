import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { platformSettings } from "../drizzle/schema";
import { decryptSecret, encryptSecret, maskSecret } from "./billing";
import { ENV } from "./_core/env";
import { getDb } from "./db";

export const MAIL_SETTING_KEY = "smtp";

type StoredMailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromAddress: string;
  passwordEnc: string | null;
  enablePasswordReset: boolean;
  enableEmailVerification: boolean;
};

const EMPTY_CONFIG: StoredMailConfig = {
  host: "",
  port: 465,
  secure: true,
  user: "",
  fromAddress: "",
  passwordEnc: null,
  enablePasswordReset: false,
  enableEmailVerification: false,
};

export async function loadMailConfig(): Promise<StoredMailConfig> {
  const db = await getDb();
  if (!db) return { ...EMPTY_CONFIG };
  try {
    const [row] = await db.select({ value: platformSettings.settingValue }).from(platformSettings).where(eq(platformSettings.settingKey, MAIL_SETTING_KEY)).limit(1);
    if (!row?.value) return { ...EMPTY_CONFIG };
    return { ...EMPTY_CONFIG, ...(JSON.parse(row.value) as Partial<StoredMailConfig>) };
  } catch {
    return { ...EMPTY_CONFIG };
  }
}

async function persistMailConfig(config: StoredMailConfig, updatedBy: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const value = JSON.stringify(config);
  await db.insert(platformSettings).values({ settingKey: MAIL_SETTING_KEY, settingValue: value, updatedBy: updatedBy.slice(0, 160) })
    .onDuplicateKeyUpdate({ set: { settingValue: value, updatedBy: updatedBy.slice(0, 160) } });
}

export type MailAdminView = {
  configured: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromAddress: string;
  passwordMasked: string | null;
  enablePasswordReset: boolean;
  enableEmailVerification: boolean;
};

export async function getMailAdminView(): Promise<MailAdminView> {
  const config = await loadMailConfig();
  let passwordMasked: string | null = null;
  if (config.passwordEnc) {
    try {
      passwordMasked = maskSecret(decryptSecret(config.passwordEnc));
    } catch {
      passwordMasked = "••••";
    }
  }
  return {
    configured: Boolean(config.host && config.user && config.passwordEnc && config.fromAddress),
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    fromAddress: config.fromAddress,
    passwordMasked,
    enablePasswordReset: config.enablePasswordReset,
    enableEmailVerification: config.enableEmailVerification,
  };
}

export async function saveMailConfig(
  input: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    fromAddress: string;
    password?: string;
    enablePasswordReset: boolean;
    enableEmailVerification: boolean;
  },
  updatedBy: string
): Promise<MailAdminView> {
  const current = await loadMailConfig();
  const host = input.host.trim().slice(0, 255);
  const user = input.user.trim().slice(0, 320);
  const fromAddress = input.fromAddress.trim().toLowerCase().slice(0, 320);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromAddress)) throw new Error("E-mail de remetente inválido.");
  const config: StoredMailConfig = {
    host,
    port: Number.isFinite(input.port) && input.port > 0 ? Math.round(input.port) : 465,
    secure: input.secure,
    user,
    fromAddress,
    passwordEnc: input.password ? encryptSecret(input.password) : current.passwordEnc,
    enablePasswordReset: input.enablePasswordReset,
    enableEmailVerification: input.enableEmailVerification,
  };
  await persistMailConfig(config, updatedBy);
  return getMailAdminView();
}

type EffectiveMailConfig = {
  from: string;
  user: string;
  password: string;
  host: string;
  port: number;
  secure: boolean;
  enabled: boolean;
};

/**
 * Configuração de SMTP efetiva: usa o que o Super Admin cadastrou no painel; se não houver
 * nada cadastrado, cai para as variáveis de ambiente da VPS (compatibilidade com instalações
 * mais antigas). A senha nunca aparece em claro fora deste arquivo.
 */
export async function resolveMailConfig(purpose: "passwordReset" | "emailVerification"): Promise<EffectiveMailConfig> {
  const stored = await loadMailConfig();
  const purposeEnabled = purpose === "passwordReset" ? stored.enablePasswordReset : stored.enableEmailVerification;
  if (stored.host && stored.user && stored.passwordEnc && stored.fromAddress) {
    let password = "";
    try {
      password = decryptSecret(stored.passwordEnc);
    } catch {
      password = "";
    }
    return {
      from: stored.fromAddress,
      user: stored.user,
      password,
      host: stored.host,
      port: stored.port,
      secure: stored.secure,
      enabled: purposeEnabled && Boolean(password),
    };
  }
  // Compatibilidade: ainda não foi configurado pelo painel, usa o .env da VPS.
  const envEnabled = purpose === "passwordReset" ? ENV.passwordResetEmailEnabled : ENV.emailVerificationEnabled;
  const from = ENV.mailFrom.trim().toLowerCase();
  const user = (ENV.smtpUser || from).trim();
  const password = ENV.smtpPassword.trim();
  const port = Number(ENV.smtpPort || 465);
  return {
    from,
    user,
    password,
    host: ENV.smtpHost.trim(),
    port: Number.isFinite(port) ? port : 465,
    secure: ENV.smtpSecure,
    enabled: envEnabled && Boolean(from && ENV.smtpHost && user && password),
  };
}

/** Envia um e-mail de teste com a configuração salva (mesmo que os envios automáticos ainda estejam desligados). */
export async function sendTestMail(to: string): Promise<{ sent: true }> {
  const stored = await loadMailConfig();
  if (!stored.host || !stored.user || !stored.passwordEnc || !stored.fromAddress) {
    throw new Error("Preencha e salve host, usuário, senha e remetente antes de testar.");
  }
  const password = decryptSecret(stored.passwordEnc);
  const transporter = nodemailer.createTransport({ host: stored.host, port: stored.port, secure: stored.secure, auth: { user: stored.user, pass: password } });
  await transporter.verify();
  await transporter.sendMail({
    from: stored.fromAddress,
    to,
    subject: "Teste de envio — Ide Fazei",
    text: "Se você recebeu este e-mail, a configuração de SMTP do Ide Fazei está funcionando.",
    html: "<p>Se você recebeu este e-mail, a configuração de SMTP do Ide Fazei está funcionando.</p>",
  });
  return { sent: true };
}
