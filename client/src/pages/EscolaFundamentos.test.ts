import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Escola de Fundamentos", () => {
  it("orienta a criação de turma, matrícula e conclusão", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/EscolaFundamentos.tsx"), "utf8");

    expect(source).toContain("Criar turma");
    expect(source).toContain("Criar primeira turma");
    expect(source).toContain("Criar e matricular participantes");
    expect(source).toContain("Matricule as Pessoas");
    expect(source).toContain("Conclua e gere certificado");
  });
});
