import { z } from "zod";

export const FOUNDATION_CREATION_SCHEMA_VERSION = 1 as const;
export const FOUNDATION_CREATION_MISSING_KEY_MESSAGE =
  "Atualize a página antes de criar este registro." as const;
export const FOUNDATION_CREATION_PAYLOAD_MISMATCH_MESSAGE =
  "Esta tentativa já foi usada com outro conteúdo." as const;
export const IDEMPOTENCY_PAYLOAD_MISMATCH_REASON =
  "IDEMPOTENCY_PAYLOAD_MISMATCH" as const;

export const foundationCreationClientRequestIdSchema = z
  .string()
  .uuid("clientRequestId deve ser um UUID válido.")
  .refine(
    value => value === value.toLowerCase(),
    "clientRequestId deve estar em minúsculas."
  );

export const foundationCreationRequestSchemaVersionSchema = z
  .number()
  .int()
  .refine(
    value => value === FOUNDATION_CREATION_SCHEMA_VERSION,
    "Versão de contrato não suportada."
  );

export type FoundationCreationOperation = "study" | "question";
export type FoundationStudyTemplate = "blank" | "biblico";
export type FoundationCreationOption = { id: string; label: string };

export type FoundationStudyCreationPayload = {
  churchId: number;
  courseId: number;
  moduleId?: number | null;
  title: string;
  weekStart?: string | null;
  summary?: string | null;
  content?: string | null;
  template: FoundationStudyTemplate;
  /** Explicit client position. A server-derived insert position is not part of the hash. */
  position?: number;
};

export type FoundationQuestionCreationPayload = {
  churchId: number;
  studyId: number;
  blockId: number;
  prompt: string;
  options: FoundationCreationOption[];
  correctOptionId: string;
  explanation: string;
};

export type FoundationCreationStoredRecord = {
  id: number;
  requestHash: string | null;
};

function normalizeText(value: string | null | undefined) {
  return value == null ? null : value.trim();
}

function normalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeJsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, nested]) => [key, normalizeJsonValue(nested)])
    );
  }
  return value;
}

function canonicalJson(value: unknown) {
  return JSON.stringify(normalizeJsonValue(value));
}

export function normalizeFoundationStudyCreationPayload(
  payload: FoundationStudyCreationPayload
) {
  return {
    contract: FOUNDATION_CREATION_SCHEMA_VERSION,
    operation: "study" as const,
    churchId: payload.churchId,
    courseId: payload.courseId,
    moduleId: payload.moduleId ?? null,
    title: payload.title.trim(),
    weekStart: normalizeText(payload.weekStart),
    summary: normalizeText(payload.summary),
    content: normalizeText(payload.content),
    template: payload.template,
    // null means “not explicitly supplied”; any server-derived insert position is excluded.
    position: payload.position ?? null,
  };
}

export function normalizeFoundationQuestionCreationPayload(
  payload: FoundationQuestionCreationPayload
) {
  return {
    contract: FOUNDATION_CREATION_SCHEMA_VERSION,
    operation: "question" as const,
    churchId: payload.churchId,
    studyId: payload.studyId,
    blockId: payload.blockId,
    prompt: payload.prompt.trim(),
    options: payload.options.map(option => ({
      id: option.id.trim(),
      label: option.label.trim(),
    })),
    correctOptionId: payload.correctOptionId.trim(),
    explanation: payload.explanation.trim(),
  };
}

export function canonicalFoundationStudyCreationPayload(
  payload: FoundationStudyCreationPayload
) {
  return canonicalJson(normalizeFoundationStudyCreationPayload(payload));
}

export function canonicalFoundationQuestionCreationPayload(
  payload: FoundationQuestionCreationPayload
) {
  return canonicalJson(normalizeFoundationQuestionCreationPayload(payload));
}

export class FoundationCreationPayloadMismatchError extends Error {
  readonly reason = IDEMPOTENCY_PAYLOAD_MISMATCH_REASON;

  constructor() {
    super(FOUNDATION_CREATION_PAYLOAD_MISMATCH_MESSAGE);
    this.name = "FoundationCreationPayloadMismatchError";
  }
}

export function assertFoundationCreationSchemaVersion(
  value: number | undefined
) {
  if (
    (value ?? FOUNDATION_CREATION_SCHEMA_VERSION) !==
    FOUNDATION_CREATION_SCHEMA_VERSION
  ) {
    throw new Error("Unsupported foundation creation request schema version");
  }
  return FOUNDATION_CREATION_SCHEMA_VERSION;
}

export function assertFoundationCreationClientRequestId(value: string) {
  const parsed = foundationCreationClientRequestIdSchema.safeParse(value);
  if (!parsed.success)
    throw new Error("Invalid foundation creation clientRequestId");
  return parsed.data;
}

/**
 * Small storage-agnostic state machine used by unit tests and alternate stores.
 * The database implementation uses the same read-before-create/unique-arbiter flow.
 */
export async function runFoundationIdempotentCreation<
  T extends FoundationCreationStoredRecord,
>({
  readExisting,
  create,
  requestHash,
  isArbitrationConflict,
}: {
  readExisting: () => Promise<T | null>;
  create: () => Promise<{ id: number }>;
  requestHash: string;
  isArbitrationConflict: (error: unknown) => boolean;
}): Promise<{ id: number; replayed: boolean }> {
  const existing = await readExisting();
  if (existing) {
    if (existing.requestHash !== requestHash)
      throw new FoundationCreationPayloadMismatchError();
    if (!Number.isSafeInteger(existing.id) || existing.id <= 0)
      throw new Error("Invalid committed foundation creation id");
    return { id: existing.id, replayed: true };
  }

  try {
    const created = await create();
    if (!Number.isSafeInteger(created.id) || created.id <= 0) {
      throw new Error("Foundation creation did not return a committed id");
    }
    return { id: created.id, replayed: false };
  } catch (error) {
    if (!isArbitrationConflict(error)) throw error;
    const winner = await readExisting();
    if (!winner) throw error;
    if (winner.requestHash !== requestHash)
      throw new FoundationCreationPayloadMismatchError();
    if (!Number.isSafeInteger(winner.id) || winner.id <= 0)
      throw new Error("Invalid committed foundation creation id");
    return { id: winner.id, replayed: true };
  }
}
