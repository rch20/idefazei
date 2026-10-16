import { createHash } from "node:crypto";
import {
  canonicalFoundationQuestionCreationPayload,
  canonicalFoundationStudyCreationPayload,
  FoundationCreationPayloadMismatchError,
  type FoundationQuestionCreationPayload,
  type FoundationStudyCreationPayload,
  runFoundationIdempotentCreation,
} from "../shared/foundationCreationContracts";

export {
  FoundationCreationPayloadMismatchError,
  runFoundationIdempotentCreation,
};

export function hashFoundationStudyCreationPayload(
  payload: FoundationStudyCreationPayload
) {
  return createHash("sha256")
    .update(canonicalFoundationStudyCreationPayload(payload), "utf8")
    .digest("hex");
}

export function hashFoundationQuestionCreationPayload(
  payload: FoundationQuestionCreationPayload
) {
  return createHash("sha256")
    .update(canonicalFoundationQuestionCreationPayload(payload), "utf8")
    .digest("hex");
}

export function isFoundationCreationDuplicateKey(
  error: unknown,
  operation: "study" | "question"
) {
  const key =
    operation === "study"
      ? "foundation_studies_church_author_request_unique"
      : "foundation_questions_church_author_request_unique";
  let current: unknown = error;
  const visited = new Set<object>();
  // DrizzleQueryError encapsula o erro MySQL; nenhuma mensagem é registrada.
  for (let depth = 0; depth < 6; depth++) {
    if (!current || typeof current !== "object" || visited.has(current))
      return false;
    visited.add(current);
    const candidate = current as {
      code?: unknown;
      errno?: unknown;
      message?: unknown;
      sqlMessage?: unknown;
      cause?: unknown;
    };
    if (candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062) {
      const message =
        typeof candidate.sqlMessage === "string"
          ? candidate.sqlMessage
          : typeof candidate.message === "string"
            ? candidate.message
            : "";
      // O índice deve aparecer como identificador da constraint, não apenas
      // como texto acidental do conteúdo de um campo.
      const namedKey = message.match(/for key ['"`]([^'"`]+)['"`]\s*$/);
      return namedKey?.[1].split(".").pop() === key;
    }
    current = candidate.cause;
  }
  return false;
}

export function isValidCommittedFoundationId(id: unknown): id is number {
  return typeof id === "number" && Number.isSafeInteger(id) && id > 0;
}
