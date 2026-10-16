import { useChurchAuth } from "@/hooks/useChurchAuth";
import { useEffect, useMemo, useRef } from "react";
import { FOUNDATION_CREATION_DATABASE_NAME } from "@/lib/foundationCreationStorage";

export const FOUNDATION_CREATION_REQUEST_SCHEMA_VERSION = 1 as const;
export const FOUNDATION_CREATION_CONFLICT_MESSAGE =
  "Esta tentativa já foi usada com outro conteúdo. Seu texto foi preservado.";
export const FOUNDATION_CREATION_SERVER_CONFLICT_MESSAGE =
  "Esta tentativa já foi usada com outro conteúdo.";
export const FOUNDATION_CREATION_STORAGE_ERROR_MESSAGE =
  "Não foi possível preparar o salvamento seguro. Verifique o armazenamento deste navegador antes de tentar novamente.";
export const FOUNDATION_CREATION_AUTH_ERROR_MESSAGE =
  "Não foi possível confirmar sua identidade nesta igreja. Atualize a página antes de criar este registro.";

export type FoundationCreationOperation = "study" | "question";
export type FoundationCreationState =
  | "pending"
  | "unknown"
  | "confirmed"
  | "conflict";

export type FoundationStudyCreationSnapshot = {
  churchId: number;
  courseId: number;
  moduleId: number | null;
  weekStart: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  template: "blank" | "biblico";
};

export type FoundationQuestionCreationSnapshot = {
  churchId: number;
  studyId: number;
  blockId: number;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  correctOptionId: string;
  explanation: string;
};

export type FoundationCreationSnapshot =
  | FoundationStudyCreationSnapshot
  | FoundationQuestionCreationSnapshot;

export type FoundationCreationScope = {
  origin: string;
  churchId: number;
  accountId: number;
};

export type FoundationCreationRecord = {
  key: string;
  scopeKey: string;
  origin: string;
  churchId: number;
  accountId: number;
  operation: FoundationCreationOperation;
  discriminator: string;
  clientRequestId: string;
  requestSchemaVersion: typeof FOUNDATION_CREATION_REQUEST_SCHEMA_VERSION;
  snapshot: FoundationCreationSnapshot;
  state: FoundationCreationState;
  confirmedId?: number;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

type StoredRecord = FoundationCreationRecord;

export type FoundationCreationStorageAdapter = {
  list(): Promise<StoredRecord[]>;
  /** Atomically returns the existing record or claims the key with `record`. */
  claim(record: StoredRecord): Promise<StoredRecord>;
  put(record: StoredRecord, expectedRequestId?: string): Promise<void>;
  delete(key: string, expectedRequestId?: string): Promise<void>;
  clearScope(scopeKey: string): Promise<void>;
  clearAll(): Promise<void>;
};

const DATABASE_NAME = FOUNDATION_CREATION_DATABASE_NAME;
const DATABASE_VERSION = 1;
const STORE_NAME = "creations";
const RETENTION_MS = 48 * 60 * 60 * 1000;

let adapterOverride: FoundationCreationStorageAdapter | null = null;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getIndexedDb(): IDBFactory {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB indisponível");
  }
  return indexedDB;
}

function openDatabase(): Promise<IDBDatabase> {
  const factory = getIndexedDb();
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Falha ao abrir IndexedDB"));
    request.onblocked = () => reject(new Error("IndexedDB bloqueado"));
  });
}

const indexedDbAdapter: FoundationCreationStorageAdapter = {
  async list() {
    const db = await openDatabase();
    try {
      return await new Promise<StoredRecord[]>((resolve, reject) => {
        const request = db
          .transaction(STORE_NAME, "readonly")
          .objectStore(STORE_NAME)
          .getAll();
        request.onsuccess = () =>
          resolve((request.result as StoredRecord[]).map(clone));
        request.onerror = () =>
          reject(request.error ?? new Error("Falha ao ler outbox"));
      });
    } finally {
      db.close();
    }
  },
  async claim(record) {
    const db = await openDatabase();
    try {
      return await new Promise<StoredRecord>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(record.key);
        let winner: StoredRecord | undefined;
        request.onsuccess = () => {
          winner = request.result
            ? clone(request.result as StoredRecord)
            : clone(record);
          if (!request.result) store.put(clone(record));
        };
        request.onerror = () =>
          reject(request.error ?? new Error("Falha ao reclamar outbox"));
        transaction.oncomplete = () => resolve(winner ?? record);
        transaction.onerror = () =>
          reject(transaction.error ?? new Error("Falha ao reclamar outbox"));
        transaction.onabort = () =>
          reject(transaction.error ?? new Error("Falha ao reclamar outbox"));
      });
    } finally {
      db.close();
    }
  },
  async put(record, expectedRequestId) {
    const db = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        if (expectedRequestId === undefined) store.put(clone(record));
        else {
          const request = store.get(record.key);
          request.onsuccess = () => {
            if (request.result?.clientRequestId === expectedRequestId)
              store.put(clone(record));
          };
        }
        transaction.oncomplete = () => resolve();
        transaction.onerror = () =>
          reject(transaction.error ?? new Error("Falha ao gravar outbox"));
        transaction.onabort = () =>
          reject(transaction.error ?? new Error("Falha ao gravar outbox"));
      });
    } finally {
      db.close();
    }
  },
  async delete(key, expectedRequestId) {
    const db = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        if (expectedRequestId === undefined) store.delete(key);
        else {
          const request = store.get(key);
          request.onsuccess = () => {
            if (request.result?.clientRequestId === expectedRequestId)
              store.delete(key);
          };
        }
        transaction.oncomplete = () => resolve();
        transaction.onerror = () =>
          reject(transaction.error ?? new Error("Falha ao limpar outbox"));
        transaction.onabort = () =>
          reject(transaction.error ?? new Error("Falha ao limpar outbox"));
      });
    } finally {
      db.close();
    }
  },
  async clearScope(scopeKey) {
    const records = await this.list();
    await Promise.all(
      records
        .filter(record => record.scopeKey === scopeKey)
        .map(record => this.delete(record.key))
    );
  },
  async clearAll() {
    const db = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () =>
          reject(transaction.error ?? new Error("Falha ao limpar outbox"));
        transaction.onabort = () =>
          reject(transaction.error ?? new Error("Falha ao limpar outbox"));
      });
    } finally {
      db.close();
    }
  },
};

function storage(): FoundationCreationStorageAdapter {
  return adapterOverride ?? indexedDbAdapter;
}

/** Apenas testes/harnesses podem injetar um armazenamento; produção usa IndexedDB. */
export function setFoundationCreationStorageAdapter(
  adapter: FoundationCreationStorageAdapter | null
) {
  adapterOverride = adapter;
}

export function createMemoryFoundationCreationStorage(): FoundationCreationStorageAdapter {
  const records = new Map<string, StoredRecord>();
  return {
    async list() {
      return Array.from(records.values()).map(clone);
    },
    async claim(record) {
      const winner = records.get(record.key);
      if (winner) return clone(winner);
      records.set(record.key, clone(record));
      return clone(record);
    },
    async put(record, expectedRequestId) {
      if (
        expectedRequestId === undefined ||
        records.get(record.key)?.clientRequestId === expectedRequestId
      )
        records.set(record.key, clone(record));
    },
    async delete(key, expectedRequestId) {
      if (
        expectedRequestId === undefined ||
        records.get(key)?.clientRequestId === expectedRequestId
      )
        records.delete(key);
    },
    async clearScope(scopeKey) {
      records.forEach((record, key) => {
        if (record.scopeKey === scopeKey) records.delete(key);
      });
    },
    async clearAll() {
      records.clear();
    },
  };
}

export function foundationCreationScopeKey(scope: FoundationCreationScope) {
  return [scope.origin, scope.churchId, scope.accountId].join("|");
}

function recordKey(
  scope: FoundationCreationScope,
  operation: FoundationCreationOperation,
  discriminator: string
) {
  return [foundationCreationScopeKey(scope), operation, discriminator].join(
    "|"
  );
}

function newUuid() {
  const cryptoApi =
    typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID().toLowerCase();
  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte =>
      byte.toString(16).padStart(2, "0")
    ).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  throw new Error("UUID indisponível");
}

export async function findFoundationCreation(
  scope: FoundationCreationScope,
  operation: FoundationCreationOperation,
  discriminator: string
) {
  // Pending/unknown records must remain addressable after a short TTL: removing
  // them would silently mint a second UUID while the server may still commit.
  const records = await storage().list();
  const key = recordKey(scope, operation, discriminator);
  return records.find(record => record.key === key) ?? null;
}

export async function beginFoundationCreation<
  T extends FoundationCreationSnapshot,
>(
  scope: FoundationCreationScope,
  operation: FoundationCreationOperation,
  discriminator: string,
  snapshot: T
) {
  const now = Date.now();
  const record: FoundationCreationRecord = {
    key: recordKey(scope, operation, discriminator),
    scopeKey: foundationCreationScopeKey(scope),
    origin: scope.origin,
    churchId: scope.churchId,
    accountId: scope.accountId,
    operation,
    discriminator,
    clientRequestId: newUuid(),
    requestSchemaVersion: FOUNDATION_CREATION_REQUEST_SCHEMA_VERSION,
    snapshot: clone(snapshot),
    state: "pending",
    createdAt: now,
    updatedAt: now,
    expiresAt: now + RETENTION_MS,
  };
  return storage().claim(record);
}

export async function updateFoundationCreation(
  record: FoundationCreationRecord,
  state: FoundationCreationState,
  confirmedId?: number
) {
  const next: FoundationCreationRecord = {
    ...record,
    state,
    confirmedId,
    updatedAt: Date.now(),
    expiresAt: Date.now() + RETENTION_MS,
    snapshot: clone(record.snapshot),
  };
  await storage().put(next, record.clientRequestId);
  return next;
}

export async function confirmAndClearFoundationCreation(
  record: FoundationCreationRecord,
  confirmedId: number
) {
  const confirmed = await updateFoundationCreation(
    record,
    "confirmed",
    confirmedId
  );
  await storage().delete(confirmed.key, record.clientRequestId);
  return confirmed;
}

export async function clearFoundationCreationScope(
  scope: FoundationCreationScope
) {
  await storage().clearScope(foundationCreationScopeKey(scope));
}

export async function clearAllFoundationCreationOutbox() {
  try {
    await storage().clearAll();
  } catch {
    // Logout não deve bloquear o redirecionamento; não há dados de autenticação aqui.
  }
}

export function useFoundationCreationScope(
  churchId: number,
  accountIdOverride?: number
) {
  const { user } = useChurchAuth();
  const scope = useMemo<FoundationCreationScope | null>(() => {
    if (typeof window === "undefined") return null;
    const accountId = accountIdOverride ?? user?.id;
    if (
      typeof accountId !== "number" ||
      !Number.isSafeInteger(accountId) ||
      accountId <= 0
    )
      return null;
    if (accountIdOverride == null && (!user || user.churchId !== churchId))
      return null;
    return { origin: window.location.origin, churchId, accountId };
  }, [accountIdOverride, churchId, user]);
  const previousKey = useRef<string | null>(null);
  const key = scope ? foundationCreationScopeKey(scope) : null;
  useEffect(() => {
    if (previousKey.current && previousKey.current !== key) {
      const oldKey = previousKey.current;
      void storage()
        .clearScope(oldKey)
        .catch(() => undefined);
    }
    previousKey.current = key;
  }, [key]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const clear = () => {
      const oldKey = previousKey.current;
      if (oldKey)
        void storage()
          .clearScope(oldKey)
          .catch(() => undefined);
      previousKey.current = null;
    };
    window.addEventListener("idefazei:church-logout", clear);
    return () => window.removeEventListener("idefazei:church-logout", clear);
  }, []);
  return scope;
}

export function isFoundationCreationConflict(error: unknown) {
  const candidate = error as {
    message?: unknown;
    data?: { code?: unknown; cause?: { reason?: unknown } | unknown };
    cause?: { reason?: unknown } | unknown;
  } | null;
  const code = candidate?.data?.code;
  const message = candidate?.message;
  const cause = candidate?.data?.cause ?? candidate?.cause;
  const reason =
    typeof cause === "object" && cause !== null && "reason" in cause
      ? (cause as { reason?: unknown }).reason
      : undefined;
  return (
    code === "CONFLICT" &&
    (message === FOUNDATION_CREATION_CONFLICT_MESSAGE ||
      message === FOUNDATION_CREATION_SERVER_CONFLICT_MESSAGE ||
      reason === "IDEMPOTENCY_PAYLOAD_MISMATCH")
  );
}

export function foundationCreationErrorMessage(error: unknown) {
  if (isFoundationCreationConflict(error))
    return FOUNDATION_CREATION_CONFLICT_MESSAGE;
  const rawMessage = error instanceof Error ? error.message : "";
  if (/indexeddb|outbox|quota|storage|armazenamento/i.test(rawMessage)) {
    return FOUNDATION_CREATION_STORAGE_ERROR_MESSAGE;
  }
  const code = (error as { data?: { code?: unknown } } | null)?.data?.code;
  if (code === "FORBIDDEN")
    return "Você não tem permissão para criar este registro nesta igreja.";
  if (code === "UNAUTHORIZED")
    return "Sua sessão precisa ser renovada. Seu texto foi preservado.";
  if (code === "BAD_REQUEST")
    return "Revise os campos e atualize a página se necessário. Seu texto foi preservado.";
  return "Não foi possível salvar. Os campos continuam preenchidos. Verifique o salvamento ou repita a mesma tentativa.";
}
export function foundationCreationDiscriminator(
  operation: FoundationCreationOperation,
  input: { studyId?: number; blockId?: number } = {}
) {
  if (operation === "study") return "new-study";
  return `study-${input.studyId ?? 0}-block-${input.blockId ?? 0}`;
}

export function foundationCreationRequest<T extends FoundationCreationSnapshot>(
  record: FoundationCreationRecord,
  snapshot: T = record.snapshot as T
) {
  return {
    ...clone(snapshot),
    clientRequestId: record.clientRequestId,
    requestSchemaVersion: record.requestSchemaVersion,
  };
}

export type FoundationCreationStatus =
  | { status: "confirmed"; id: number }
  | { status: "not_found" };

/**
 * O contrato pode entrar no AppRouter depois deste frontend. Manter a chamada
 * localizada evita espalhar casts e nunca transforma ausência do endpoint em
 * autorização para criar com outra chave.
 */
export async function fetchFoundationCreationStatus(
  utils: unknown,
  input: {
    churchId: number;
    operation: FoundationCreationOperation;
    clientRequestId: string;
  }
): Promise<FoundationCreationStatus> {
  const candidate = utils as {
    escolaFundamentos?: {
      getCreationStatus?: {
        fetch?: (value: typeof input) => Promise<FoundationCreationStatus>;
      };
    };
  };
  const fetcher = candidate.escolaFundamentos?.getCreationStatus?.fetch;
  if (!fetcher)
    throw new Error("A consulta de salvamento ainda não está disponível.");
  return fetcher(input);
}
