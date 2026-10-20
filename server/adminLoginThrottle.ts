/**
 * Limite de tentativas erradas no login do Super Admin (em memória; zera ao reiniciar o servidor).
 * - por origem (IP + e-mail): poucas falhas seguidas bloqueiam por um tempo;
 * - por conta (e-mail): limite maior, para frear ataques que trocam de IP sem deixar o administrador trancado por muito tempo.
 */
export type LoginThrottleOptions = {
  maxPerOrigin?: number;
  maxPerAccount?: number;
  windowMs?: number;
  now?: () => number;
};

type Entry = { startedAt: number; count: number };

export function createLoginThrottle(options: LoginThrottleOptions = {}) {
  const maxPerOrigin = options.maxPerOrigin ?? 5;
  const maxPerAccount = options.maxPerAccount ?? 20;
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const now = options.now ?? Date.now;
  const origins = new Map<string, Entry>();
  const accounts = new Map<string, Entry>();

  const live = (map: Map<string, Entry>, key: string): Entry | null => {
    const entry = map.get(key);
    if (!entry) return null;
    if (now() - entry.startedAt >= windowMs) {
      map.delete(key);
      return null;
    }
    return entry;
  };
  const bump = (map: Map<string, Entry>, key: string) => {
    const entry = live(map, key);
    if (entry) entry.count += 1;
    else map.set(key, { startedAt: now(), count: 1 });
    if (map.size > 5000) map.clear();
  };
  const normalize = (email: string) => email.trim().toLowerCase().slice(0, 320);
  const originKey = (ip: string, email: string) => `${ip.slice(0, 128)}|${normalize(email)}`;

  return {
    /** Quantos segundos faltam para poder tentar de novo; 0 se pode tentar. */
    retryAfterSeconds(ip: string, email: string): number {
      const waits: number[] = [];
      const origin = live(origins, originKey(ip, email));
      if (origin && origin.count >= maxPerOrigin) waits.push(origin.startedAt + windowMs - now());
      const account = live(accounts, normalize(email));
      if (account && account.count >= maxPerAccount) waits.push(account.startedAt + windowMs - now());
      return waits.length ? Math.max(1, Math.ceil(Math.max(...waits) / 1000)) : 0;
    },
    recordFailure(ip: string, email: string) {
      bump(origins, originKey(ip, email));
      bump(accounts, normalize(email));
    },
    recordSuccess(ip: string, email: string) {
      origins.delete(originKey(ip, email));
    },
  };
}

/** IP de origem: Cloudflare, depois o primeiro do X-Forwarded-For, depois a conexão direta. */
export function clientIpFromRequest(req: { headers: Record<string, unknown>; socket?: { remoteAddress?: string | null } }): string {
  const pick = (value: unknown) => String((Array.isArray(value) ? value[0] : value) ?? "").split(",")[0].trim();
  return pick(req.headers["cf-connecting-ip"]) || pick(req.headers["x-forwarded-for"]) || req.socket?.remoteAddress || "unknown";
}
