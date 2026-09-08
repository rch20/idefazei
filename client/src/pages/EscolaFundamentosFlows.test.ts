import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/EscolaFundamentos.tsx"), "utf8");
const adaptiveSource = readFileSync(resolve(process.cwd(), "client/src/components/AdaptiveFormDialog.tsx"), "utf8");
const schemaSource = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

describe("Formação de Fundamentos", () => {
  it("usa o padrão adaptativo somente para criar uma turma", () => {
    expect(source).toContain("Criar turma de Fundamentos");
    expect(source).toContain("AdaptiveFormDialogContent");
    expect(source).toContain("AdaptiveFormDialogBody");
    expect(source).toContain("AdaptiveFormDialogFooter");
    expect(source).toContain("canManageStudies");
  });

  it("mantém o erro de criação dentro do formulário", () => {
    expect(source).toContain("createError");
    expect(source).toContain("role=\"alert\"");
    expect(source).toContain("Informe um nome com ao menos 3 caracteres.");
    expect(source).toContain("setCreateError(null)");
  });

  it("mantém matrícula e gestão de trilhas fora do cadastro de turma", () => {
    expect(source).toContain("Matricular Pessoa");
    expect(source).toContain("Confirmar matrícula");
    expect(source).toContain("Gerenciar trilhas");
    expect(source).toContain("Criar módulo");
    expect(source).toContain("Criar estudo");
  });

  it("preserva a camada superior e o rodapé seguro do modelo adaptativo", () => {
    expect(adaptiveSource).toContain("z-[200]");
    expect(adaptiveSource).toContain("100dvh");
    expect(adaptiveSource).toContain("safe-area-inset-bottom");
  });

  it("oferece aula digital com retomada, reflexão e conclusão sem prova formal", () => {
    expect(source).toContain("learningPath");
    expect(source).toContain("Continuar aula");
    expect(source).toContain("Reflexão da aula");
    expect(source).toContain("Não é uma prova.");
    expect(source).toContain("completeLesson");
  });

  it("protege a liberação sequencial no backend e mantém o progresso por matrícula", () => {
    expect(schemaSource).toContain("foundationLessonProgress");
    expect(schemaSource).toContain("foundation_lesson_progress_enrollment_study_unique");
    expect(routerSource).toContain("reviewLesson");
    expect(routerSource).toContain("releaseNextStudy");
    expect(routerSource).toContain("Esta aula ainda aguarda a liberação do professor.");
    expect(routerSource).toContain("Registre a revisão como Compreendeu antes de liberar o próximo tema.");
  });
});

export {};
