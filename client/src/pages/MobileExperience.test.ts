import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../../..");
const dialogSource = readFileSync(resolve(root, "client/src/components/ui/dialog.tsx"), "utf8");
const peopleSource = readFileSync(resolve(root, "client/src/pages/Pessoas.tsx"), "utf8");
const cellsSource = readFileSync(resolve(root, "client/src/pages/Celulas.tsx"), "utf8");
const ministriesSource = readFileSync(resolve(root, "client/src/pages/Ministerios.tsx"), "utf8");

describe("Experiência mobile e estados vazios", () => {
  it("mantém modais roláveis e compactos no celular", () => {
    expect(dialogSource).toContain("max-h-[calc(100dvh-1rem)]");
    expect(dialogSource).toContain("overflow-y-auto");
    expect(dialogSource).toContain("p-4");
    expect(dialogSource).toContain("sm:p-6");
  });

  it("diferencia busca sem resultado de ausência de Pessoas", () => {
    expect(peopleSource).toContain("Nenhuma Pessoa encontrada");
    expect(peopleSource).toContain("Limpar busca");
    expect(peopleSource).toContain("Cadastrar primeira Pessoa");
  });

  it("mostra o primeiro passo de Células apenas para a governança pastoral", () => {
    expect(cellsSource).toContain("Nenhuma Célula no seu escopo");
    expect(cellsSource).toContain("Quando o Pastor direcionar você para uma Célula");
    expect(cellsSource).toContain("canPublishCells && <Button");
  });

  it("diferencia busca sem resultado de ausência de Ministério", () => {
    expect(ministriesSource).toContain("Nenhum Ministério encontrado");
    expect(ministriesSource).toContain("Nenhum Ministério no seu escopo");
    expect(ministriesSource).toContain("Criar primeiro Ministério");
  });
});
