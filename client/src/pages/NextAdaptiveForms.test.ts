import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) => readFileSync(new URL(`./${relativePath}`, import.meta.url), "utf8");
const readComponent = (relativePath: string) => readFileSync(new URL(`../components/${relativePath}`, import.meta.url), "utf8");

describe("próximos formulários extensos no padrão adaptativo", () => {
  it("mantém Nova Alma adaptativa sem remover regras de indicação e duplicidade", () => {
    const page = readSource("GanharAlmas.tsx");
    expect(page).toContain("AdaptiveFormDialogContent");
    expect(page).toContain("AdaptiveFormDialogBody");
    expect(page).toContain("AdaptiveFormDialogFooter");
    expect(page).toContain("isLimitedMember");
    expect(page).toContain("findPossibleMatches");
    expect(page).toContain("existingPersonId");
    expect(page).toContain("wonById");
  });

  it("mantém o cadastro e a ficha longa de Pessoa acima da navegação móvel", () => {
    const page = readSource("Pessoas.tsx");
    expect(page.match(/<AdaptiveFormDialogContent/g)).toHaveLength(2);
    expect(page).toContain("AdaptiveFormDialogBody");
    expect(page).toContain("AdaptiveFormDialogFooter");
    expect(page).toContain("closePersonJourney");
    expect(page).toContain("canManagePastoralCoverage");
    expect(page).toContain("personSection");
  });

  it("mantém Publicação da Célula com mapa, validação e ações adaptativas", () => {
    const component = readComponent("CellPublicSettingsDialog.tsx");
    expect(component).toContain("AdaptiveFormDialogContent");
    expect(component).toContain("AdaptiveFormDialogBody");
    expect(component).toContain("AdaptiveFormDialogFooter");
    expect(component).toContain("OpenStreetMap");
    expect(component).toContain("updatePublicSettings");
    expect(component).toContain("publicVisible");
    expect(component).toContain('role="alert"');
  });
});
