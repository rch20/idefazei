import { describe, expect, it } from "vitest";
import { describeFoundationImportFailure } from "./foundationImportDiagnostics";

describe("foundationImportDiagnostics", () => {
  it("identifica a etapa e devolve um código útil sem expor a mensagem interna", () => {
    const result = describeFoundationImportFailure("rascunho", "abc123", new Error("DATABASE_URL=secret"));

    expect(result.code).toBe("FUNDAMENTOS_IMPORT_RASCUNHO_ABC123");
    expect(result.userMessage).toContain("salvamento da prévia");
    expect(result.userMessage).toContain(result.code);
    expect(result.userMessage).not.toContain("DATABASE_URL");
    expect(result.userMessage).not.toContain("secret");
    expect(result.logContext).toEqual({
      code: result.code,
      stage: "rascunho",
      errorName: "Error",
    });
  });

  it("normaliza o identificador e não vaza nomes de erro arbitrários", () => {
    const result = describeFoundationImportFailure(
      "parser",
      "../../token?x=1",
      { name: "Erro com detalhes e token" },
    );

    expect(result.code).toBe("FUNDAMENTOS_IMPORT_PARSER_TOKENX1");
    expect(result.logContext.errorName).toBe("UnknownError");
    expect(result.userMessage).not.toContain("Erro com detalhes");
  });
});
