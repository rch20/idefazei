import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("contrato da prévia de importação de Fundamentos", () => {
  it("não volta à mensagem genérica sem etapa quando há falha interna", () => {
    const source = readFileSync(resolve(process.cwd(), "server/_core/index.ts"), "utf8");

    expect(source).toContain("createFoundationImportRequestId");
    expect(source).toContain('stage = "catalogo"');
    expect(source).toContain('stage = "parser"');
    expect(source).toContain('stage = "rascunho"');
    expect(source).toContain("describeFoundationImportFailure(stage, requestId, error)");
    expect(source).toContain("code: failure.code");
    expect(source).not.toContain('return res.status(500).json({ error: "Não foi possível validar o gabarito." });');
  });
});
