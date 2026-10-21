import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cells = readFileSync("client/src/pages/Celulas.tsx", "utf8");
const studies = readFileSync("client/src/pages/EstudosCelulas.tsx", "utf8");

describe("Células: revisão", () => {
  it("conta localização com a mesma regra do mapa", () => {
    expect(cells).toContain("filter((c) => hasPublicCellLocation(c)).length");
  });
  it("lista células fora do mapa, busca e quantidade de pessoas", () => {
    expect(cells).toContain("ainda não aparece");
    expect(cells).toContain("Buscar por nome, bairro ou cidade");
    expect(cells).toContain("memberCountByCell");
  });
  it("destaca o estudo da semana", () => {
    expect(studies).toContain("Desta semana");
    expect(studies).toContain("function isCurrentWeek");
  });
});
