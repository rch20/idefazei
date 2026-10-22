import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, count, eq, gte, lt } from "drizzle-orm";
import { rateLimitHits } from "../drizzle/schema";
import { clientIpFromRequest } from "./adminLoginThrottle";
import { getDb } from "./db";

/**
 * Limitador de tentativas guardado no banco: sobrevive a reinício e vale para qualquer instância.
 * Se o banco falhar, libera a ação (e registra o erro) para não trancar ninguém por falha nossa.
 */
function hashKey(key: string) {
  return createHash("sha256").update(key.toLowerCase().slice(0, 512)).digest("hex").slice(0, 40);
}

export async function rateLimitCount(bucket: string, key: string, windowSec: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const since = new Date(Date.now() - windowSec * 1000);
  const [row] = await db.select({ n: count() }).from(rateLimitHits).where(and(eq(rateLimitHits.bucket, bucket), eq(rateLimitHits.keyHash, hashKey(key)), gte(rateLimitHits.createdAt, since)));
  return Number(row?.n ?? 0);
}

export async function rateLimitRecord(bucket: string, key: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(rateLimitHits).values({ bucket, keyHash: hashKey(key) });
  // Limpeza oportunista: registros com mais de 2 dias não servem para nenhuma janela.
  if (Math.random() < 0.02) {
    await db.delete(rateLimitHits).where(lt(rateLimitHits.createdAt, new Date(Date.now() - 2 * 24 * 3600 * 1000)));
  }
}

export async function rateLimitClear(bucket: string, key: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(rateLimitHits).where(and(eq(rateLimitHits.bucket, bucket), eq(rateLimitHits.keyHash, hashKey(key))));
}

export type RateRule = { bucket: string; key: string; max: number; windowSec: number };

async function safely<T>(action: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await action();
  } catch (error) {
    console.error("[rate-limit] falha ao consultar o banco:", error instanceof Error ? error.message : error);
    return fallback;
  }
}

/** Segundos até a regra liberar; 0 se ainda há folga. Não registra nada. */
export async function rateLimitWait(rules: RateRule[]): Promise<number> {
  return safely(async () => {
    let wait = 0;
    for (const rule of rules) {
      if ((await rateLimitCount(rule.bucket, rule.key, rule.windowSec)) >= rule.max) wait = Math.max(wait, rule.windowSec);
    }
    return wait;
  }, 0);
}

export async function rateLimitRecordAll(rules: RateRule[]) {
  await safely(async () => { for (const rule of rules) await rateLimitRecord(rule.bucket, rule.key); }, undefined);
}

/** Conta a tentativa e bloqueia quando passa do máximo (para ações públicas: cadastro, contato, e-mails). */
export async function enforceRateLimit(rules: RateRule[], message = "Muitas tentativas. Aguarde um pouco e tente de novo.") {
  const wait = await rateLimitWait(rules);
  if (wait > 0) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message });
  await rateLimitRecordAll(rules);
}

export function requestIp(req: unknown): string {
  return clientIpFromRequest(req as Parameters<typeof clientIpFromRequest>[0]);
}

/** Limite por origem (IP) para uma ação pública. */
export async function enforcePublicRateLimit(ctx: { req: unknown }, bucket: string, max: number, windowSec = 3600, message?: string) {
  await enforceRateLimit([{ bucket, key: requestIp(ctx.req), max, windowSec }], message);
}

/** Teto global de e-mails enviados pela plataforma: protege contra envio em massa e conta SMTP bloqueada. */
export const MAIL_HOURLY_CAP = 300;
export const MAIL_DAILY_CAP = 1500;
export async function consumeMailBudget() {
  const rules: RateRule[] = [
    { bucket: "mail-out", key: "hora", max: MAIL_HOURLY_CAP, windowSec: 3600 },
    { bucket: "mail-out", key: "dia", max: MAIL_DAILY_CAP, windowSec: 86400 },
  ];
  const hourly = (await safely(() => rateLimitCount("mail-out", "hora", 3600), 0)) >= MAIL_HOURLY_CAP;
  const daily = (await safely(() => rateLimitCount("mail-out", "dia", 86400), 0)) >= MAIL_DAILY_CAP;
  if (hourly || daily) throw new Error("Limite de e-mails da plataforma atingido; envio adiado.");
  await rateLimitRecordAll(rules.map(rule => ({ ...rule, max: Infinity })));
}
