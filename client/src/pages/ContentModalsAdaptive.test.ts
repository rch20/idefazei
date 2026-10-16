import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(new URL(`./${file}`, import.meta.url), "utf8");

describe("formulários de conteúdo no padrão adaptativo", () => {
  const targets = [
    "Comunicacao.tsx",
    "Oracao.tsx",
    "Mural.tsx",
    "Biblioteca.tsx",
  ];

  it.each(targets)("usa Full-Screen Modal opt-in em %s", (file) => {
    const content = source(file);
    expect(content).toContain("AdaptiveFormDialogContent");
    expect(content).toContain("AdaptiveFormDialogBody");
    expect(content).toContain("AdaptiveFormDialogFooter");
    expect(content).toContain("adaptiveFormDialogHeaderClassName");
  });

  it("mantém a pré-visualização do Mural separada do formulário adaptativo", () => {
    const content = source("Mural.tsx");
    expect(content.match(/<AdaptiveFormDialogContent>/g)).toHaveLength(1);
    expect(content).toContain("mural-announcement-preview-dialog");
    expect(content).toContain("<DialogContent className=\"mural-announcement-preview-dialog");
  });

  it("mantém mensagens de erro dentro dos quatro formulários", () => {
    for (const file of targets) {
      const content = source(file);
      expect(content).toMatch(/role=\"alert\"/);
    }
  });
});
