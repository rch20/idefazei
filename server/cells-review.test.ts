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

describe("Estudos de Células: cartão simples para estudo pronto", () => {
  it("estudo enviado em arquivo mostra só título e PDF, sem seções vazias", () => {
    expect(studies).toContain("function isReadyStudy");
    expect(studies).toContain("function StudySections");
    expect(studies).not.toContain("Não informado.");
    expect(studies).not.toContain("Estudo oficial preparado para aplicação na Célula.");
  });
});

describe("Palavra do dia", () => {
  it("mostra o trecho na página pública e avisa no Mural quando falta", () => {
    const publicPage = readFileSync("client/src/pages/TenantPublicPage.tsx", "utf8");
    const mural = readFileSync("client/src/pages/Mural.tsx", "utf8");
    expect(publicPage).toContain("Palavra de hoje");
    expect(mural).toContain("Nenhuma palavra do dia publicada para hoje");
    expect(mural).toContain("Escrever devocional");
  });
});
