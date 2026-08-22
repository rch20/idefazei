import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Escola de Fundamentos", () => {
  it("orienta a criação de turma, matrícula e conclusão", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/EscolaFundamentos.tsx"), "utf8");

    expect(source).toContain("Criar turma");
    expect(source).toContain("Criar primeira turma");
    expect(source).toContain("conecte materiais do acervo");
    expect(source).toContain("Jornada, não depósito de arquivos");
    expect(source).toContain("Gerenciar estudos");
    expect(source).toContain("Administradores de estudos");
    expect(source).toContain("canManageStudies");
    expect(source).toContain("Biblioteca Digital");
    expect(source).toContain("Materiais do estudo");
    expect(source).toContain("attachStudyMaterial");
  });
});
