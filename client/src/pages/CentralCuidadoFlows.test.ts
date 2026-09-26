import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");
const page = readFileSync(resolve(root, "client/src/pages/CentralCuidado.tsx"), "utf8");
const personPage = readFileSync(resolve(root, "client/src/pages/Pessoas.tsx"), "utf8");
const summary = readFileSync(resolve(root, "client/src/components/PersonExecutiveSummary.tsx"), "utf8");

describe("Central de Cuidado — separação de responsabilidades", () => {
  it("mostra discipulador, cuidado operacional e Consolidação como relações distintas", () => {
    expect(page).toContain("Discipulador:");
    expect(page).toContain("Cuidado operacional:");
    expect(page).toContain("Sem cuidado operacional");
    expect(page).toContain("Consolidação:");
    expect(page).toContain("operationalAssignments");
  });

  it("não usa a Consolidação para substituir o discipulador na ficha", () => {
    expect(personPage).toContain("Esta ação altera somente o discipulador principal");
    expect(personPage).toContain("O discipulador principal permanece o mesmo.");
    expect(personPage).toContain("Este apoio é independente do discipulador principal.");
    expect(personPage).toContain('filter(([value]) => value !== "discipulador")');
  });

  it("rotula o indicador do resumo como cuidado operacional", () => {
    expect(summary).toContain('responsibleLabel = "Cuidado operacional"');
    expect(summary).toContain("Apoio independente do discipulador");
  });
});
