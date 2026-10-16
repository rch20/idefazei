import { describe, expect, it } from "vitest";
import {
  isFoundationCreationDuplicateKey,
  isValidCommittedFoundationId,
} from "./foundationCreationIdempotency";

const studyKey = "foundation_studies_church_author_request_unique";
const questionKey = "foundation_questions_church_author_request_unique";
const duplicate = (key: string) => ({
  code: "ER_DUP_ENTRY",
  errno: 1062,
  sqlMessage: `Duplicate entry 'synthetic-only' for key 'table.${key}'`,
});

describe("árbitro seguro da constraint de criação", () => {
  it("reconhece só a constraint de estudos ou perguntas solicitada", () => {
    expect(isFoundationCreationDuplicateKey(duplicate(studyKey), "study")).toBe(
      true
    );
    expect(
      isFoundationCreationDuplicateKey(duplicate(questionKey), "question")
    ).toBe(true);
    expect(
      isFoundationCreationDuplicateKey(duplicate(studyKey), "question")
    ).toBe(false);
  });
  it("atravessa o cause real do DrizzleQueryError sem ler SQL ou parâmetros", () => {
    expect(
      isFoundationCreationDuplicateKey(
        { message: "Failed query", cause: duplicate(studyKey) },
        "study"
      )
    ).toBe(true);
  });
  it("nome de índice no conteúdo duplicado não identifica a constraint", () => {
    expect(
      isFoundationCreationDuplicateKey(
        {
          code: "ER_DUP_ENTRY",
          sqlMessage: `Duplicate entry '${studyKey}' for key 'table.another_unique'`,
        },
        "study"
      )
    ).toBe(false);
  });
  it("bloqueia outros erros de banco ou mensagens sem identificador do índice", () => {
    expect(
      isFoundationCreationDuplicateKey(
        { code: "ER_LOCK_DEADLOCK", message: studyKey },
        "study"
      )
    ).toBe(false);
    expect(
      isFoundationCreationDuplicateKey(
        { code: "ER_DUP_ENTRY", message: studyKey },
        "study"
      )
    ).toBe(false);
    expect(isFoundationCreationDuplicateKey(null, "study")).toBe(false);
  });
  it("um cause cíclico não causa loop", () => {
    const cyclic: { cause?: unknown } = {};
    cyclic.cause = cyclic;
    expect(isFoundationCreationDuplicateKey(cyclic, "study")).toBe(false);
  });
  it("não atravessa uma cadeia de causas sem limite", () => {
    let error: unknown = duplicate(studyKey);
    for (let i = 0; i < 8; i++) error = { cause: error };
    expect(isFoundationCreationDuplicateKey(error, "study")).toBe(false);
  });
  it("identificador confirmado deve ser inteiro seguro positivo", () => {
    expect(isValidCommittedFoundationId(42)).toBe(true);
    for (const id of [
      0,
      -1,
      1.2,
      Number.NaN,
      Number.MAX_SAFE_INTEGER + 1,
      null,
      "42",
    ])
      expect(isValidCommittedFoundationId(id)).toBe(false);
  });
});
