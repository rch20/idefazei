import { normalizeSocialMediaUrl, SOCIAL_PLATFORM_KEYS, type SocialMediaLinks } from "./socialMedia";

/** Contatos públicos da plataforma Ide Fazei (página de venda, Fale conosco e rodapé). */
export type PlatformContact = {
  whatsapp: string | null; // somente dígitos, sem o 55
  phone: string | null; // somente dígitos, sem o 55
  email: string | null;
  address: string | null;
  businessHours: string | null; // uma linha por faixa de horário
  whatsappMessage: string | null;
  legalName: string | null;
  cnpj: string | null; // 14 dígitos
  social: SocialMediaLinks;
};

export const EMPTY_PLATFORM_CONTACT: PlatformContact = {
  whatsapp: null,
  phone: null,
  email: null,
  address: null,
  businessHours: null,
  whatsappMessage: null,
  legalName: null,
  cnpj: null,
  social: {},
};

export const DEFAULT_WHATSAPP_MESSAGE = "Olá! Vim pelo site do Ide Fazei e gostaria de conhecer a plataforma.";

export type PlatformContactField = keyof Omit<PlatformContact, "social"> | "instagram" | "facebook" | "youtube" | "tiktok";
export type PlatformContactResult =
  | { ok: true; value: PlatformContact }
  | { ok: false; errors: Partial<Record<PlatformContactField, string>> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function text(value: unknown, max: number): string | null | "invalid" {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return "invalid";
  const cleaned = value.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return null;
  // sem caracteres de controle (exceto quebra de linha) nem marcações HTML
  if (cleaned.length > max || /[\u0000-\u0009\u000b-\u001f<>]/.test(cleaned)) return "invalid";
  return cleaned;
}

/** Telefone brasileiro: aceita máscara e +55; devolve só os dígitos nacionais (10 ou 11) ou null. */
export function normalizeBrazilianPhone(value: unknown): string | null | "invalid" {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return "invalid";
  let digits = value.replace(/\D/g, "");
  if (!digits) return null;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length !== 10 && digits.length !== 11) return "invalid";
  if (digits.startsWith("0")) return "invalid";
  if (digits.length === 11 && digits[2] !== "9") return "invalid"; // celular começa com 9 depois do DDD
  return digits;
}

export function formatBrazilianPhone(digits: string | null | undefined): string {
  const d = (digits ?? "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

export function formatCnpj(digits: string | null | undefined): string {
  const d = (digits ?? "").replace(/\D/g, "");
  if (d.length !== 14) return d;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function buildPlatformWhatsAppLink(contact: Pick<PlatformContact, "whatsapp" | "whatsappMessage">): string | null {
  if (!contact.whatsapp) return null;
  const message = contact.whatsappMessage || DEFAULT_WHATSAPP_MESSAGE;
  return `https://wa.me/55${contact.whatsapp}?text=${encodeURIComponent(message)}`;
}

/** Valida e normaliza a entrada do Super Admin. Campos vazios viram null (canal não exibido). */
export function normalizePlatformContactInput(raw: unknown): PlatformContactResult {
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const errors: Partial<Record<PlatformContactField, string>> = {};
  const value: PlatformContact = { ...EMPTY_PLATFORM_CONTACT, social: {} };

  const whatsapp = normalizeBrazilianPhone(input.whatsapp);
  if (whatsapp === "invalid") errors.whatsapp = "WhatsApp inválido. Informe DDD + número de celular, ex.: (11) 91234-5678.";
  else value.whatsapp = whatsapp;

  const phone = normalizeBrazilianPhone(input.phone);
  if (phone === "invalid") errors.phone = "Telefone inválido. Informe DDD + número, ex.: (11) 3456-7890.";
  else value.phone = phone;

  const email = text(input.email, 160);
  if (email === "invalid" || (email !== null && !EMAIL.test(email))) errors.email = "E-mail inválido.";
  else value.email = email === null ? null : email.toLowerCase();

  for (const [field, max, label] of [
    ["address", 200, "Endereço"],
    ["businessHours", 300, "Horário de atendimento"],
    ["whatsappMessage", 200, "Mensagem inicial do WhatsApp"],
    ["legalName", 120, "Razão social"],
  ] as const) {
    const parsed = text(input[field], max);
    if (parsed === "invalid") errors[field] = `${label} inválido (máximo ${max} caracteres, sem < ou >).`;
    else value[field] = parsed;
  }
  if (value.businessHours && value.businessHours.split("\n").length > 6) errors.businessHours = "Use no máximo 6 linhas de horário.";

  if (input.cnpj !== undefined && input.cnpj !== null && String(input.cnpj).trim()) {
    const digits = String(input.cnpj).replace(/\D/g, "");
    if (digits.length !== 14) errors.cnpj = "CNPJ deve ter 14 dígitos.";
    else value.cnpj = digits;
  }

  const socialInput = input.social && typeof input.social === "object" && !Array.isArray(input.social) ? (input.social as Record<string, unknown>) : {};
  for (const platform of SOCIAL_PLATFORM_KEYS) {
    const entry = socialInput[platform];
    if (entry === undefined || entry === null || (typeof entry === "string" && !entry.trim())) continue;
    const normalized = normalizeSocialMediaUrl(platform, entry);
    if (!normalized) errors[platform] = `Link do ${platform[0].toUpperCase()}${platform.slice(1)} inválido. Use o endereço completo com https://.`;
    else value.social[platform] = normalized;
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

/** Lê o valor guardado no banco, tolerando JSON ausente ou antigo. */
export function parseStoredPlatformContact(stored: string | null | undefined): PlatformContact {
  if (!stored) return { ...EMPTY_PLATFORM_CONTACT, social: {} };
  try {
    const result = normalizePlatformContactInput(JSON.parse(stored));
    return result.ok ? result.value : { ...EMPTY_PLATFORM_CONTACT, social: {} };
  } catch {
    return { ...EMPTY_PLATFORM_CONTACT, social: {} };
  }
}
