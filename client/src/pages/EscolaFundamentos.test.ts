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
    expect(source).toContain("FoundationImportDialog");
    expect(source).toContain("Preencher por Excel");
    const importDialogSource = readFileSync(resolve(process.cwd(), "client/src/pages/foundation/FoundationImportDialog.tsx"), "utf8");
    expect(importDialogSource).toContain("Importar gabarito Excel");
    expect(importDialogSource).toContain("Confirmar importação");
    expect(importDialogSource).toContain("DialogDescription");
  });

  it("oferece ao discípulo uma preparação única sem escolha de curso", () => {
    const source = [
      readFileSync(resolve(process.cwd(), "client/src/pages/EscolaFundamentos.tsx"), "utf8"),
      readFileSync(resolve(process.cwd(), "client/src/pages/foundation/StudentLearningExperience.tsx"), "utf8"),
    ].join("\n");

    expect(source).toContain("studentPath");
    expect(source).toContain("Minha preparação");
    expect(source).toContain("Você não precisa escolher uma turma");
    expect(source).toContain("O estudo da semana aparece aqui automaticamente");
    expect(source).toContain("Concluir estudo");
    expect(source).toContain("Estudo da semana");
    expect(source).toContain("Preparação concluída");
    expect(source).toContain("Sequência da preparação");
  });
});
