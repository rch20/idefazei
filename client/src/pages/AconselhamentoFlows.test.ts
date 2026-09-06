import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/Aconselhamento.tsx"), "utf8");
const adaptiveSource = readFileSync(resolve(process.cwd(), "client/src/components/AdaptiveFormDialog.tsx"), "utf8");

describe("Modais de Aconselhamento", () => {
  it("usa o formulário adaptativo para agendar uma sessão", () => {
    expect(source).toContain("AdaptiveFormDialogContent");
    expect(source).toContain("AdaptiveFormDialogBody");
    expect(source).toContain("AdaptiveFormDialogFooter");
    expect(source).toContain("Agendar Sessão de Aconselhamento");
    expect(source).toContain("createError");
    expect(source).toContain("scheduledAt");
    expect(source).toContain("createMutation");
  });

  it("mantém anotações confidenciais como fluxo separado e compacto", () => {
    expect(source).toContain("Anotações Confidenciais");
    expect(source).toContain("Nova Anotação");
    expect(source).toContain("confidential: true");
    expect(source).toContain("<DialogContent>");
  });

  it("preserva a camada superior e a safe area do padrão global", () => {
    expect(adaptiveSource).toContain("z-[200]");
    expect(adaptiveSource).toContain("h-[100dvh]");
    expect(adaptiveSource).toContain("env(safe-area-inset-bottom)");
  });
});

export {};
