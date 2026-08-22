import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Escola de Fundamentos", () => {
  it("orienta a criação de turma, matrícula e conclusão", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/EscolaFundamentos.tsx"), "utf8");

    expect(source).toContain("Criar turma");
    expect(source).toContain("Criar primeira turma");
    expect(source).toContain("estruture módulos, estudos");
    expect(source).toContain("Uma jornada visual e clara");
    expect(source).toContain("Gerenciar trilhas");
    expect(source).toContain("Administradores de estudos");
    expect(source).toContain("canManageStudies");
    expect(source).toContain("Biblioteca Digital");
    expect(source).toContain("Materiais do estudo");
    expect(source).toContain("attachStudyMaterial");
    expect(source).toContain("Trilha de aprendizado");
    expect(source).toContain("Módulos da trilha");
    expect(source).toContain("createModule");
  });
});
