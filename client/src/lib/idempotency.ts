export function createIdempotencyKey() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

export function resetIdempotencyKey() {
  return createIdempotencyKey();
}

export function isValidIdempotencyKey(value: string) {
  return /^[a-zA-Z0-9-]{8,64}$/.test(value);
}

export const IDEMPOTENCY_KEY_MAX_LENGTH = 64;
