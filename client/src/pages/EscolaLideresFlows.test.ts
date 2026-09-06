import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/EscolaLideres.tsx"), "utf8");
const adaptiveSource = readFileSync(resolve(process.cwd(), "client/src/components/AdaptiveFormDialog.tsx"), "utf8");

describe("Modais da Escola de Líderes", () => {
  it("usa o formulário adaptativo para criar uma nova turma", () => {
    expect(source).toContain("AdaptiveFormDialogContent");
    expect(source).toContain("AdaptiveFormDialogBody");
    expect(source).toContain("AdaptiveFormDialogFooter");
    expect(source).toContain("Nova Turma — Escola de Líderes");
    expect(source).toContain("createError");
    expect(source).toContain("startDate");
    expect(source).toContain("endDate");
    expect(source).toContain("createClass");
  });

  it("mantém matrícula e certificado como ações do painel, sem migrar a matrícula curta", () => {
    expect(source).toContain("Matricular em {cls.name}");
    expect(source).toContain("Confirmar Matrícula");
    expect(source).toContain("certMutation");
    expect(source).toContain("<DialogContent>");
  });

  it("preserva a camada superior, viewport e safe area do padrão global", () => {
    expect(adaptiveSource).toContain("z-[200]");
    expect(adaptiveSource).toContain("h-[100dvh]");
    expect(adaptiveSource).toContain("overscroll-contain");
    expect(adaptiveSource).toContain("env(safe-area-inset-bottom)");
  });
});

export {};
