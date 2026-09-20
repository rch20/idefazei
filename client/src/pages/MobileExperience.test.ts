import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../../..");
const dialogSource = readFileSync(resolve(root, "client/src/components/ui/dialog.tsx"), "utf8");
const peopleSource = readFileSync(resolve(root, "client/src/pages/Pessoas.tsx"), "utf8");
const summarySource = readFileSync(resolve(root, "client/src/components/PersonExecutiveSummary.tsx"), "utf8");
const historySource = readFileSync(resolve(root, "client/src/components/PersonHistoryTimeline.tsx"), "utf8");
const sectionStateSource = readFileSync(resolve(root, "client/src/components/PersonSectionState.tsx"), "utf8");
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

  it("mantém o resumo executivo compacto e progressivo no celular", () => {
    expect(peopleSource).toContain("<PersonExecutiveSummary");
    expect(summarySource).toContain("grid grid-cols-2 gap-2 sm:grid-cols-3");
    expect(summarySource).toContain("col-span-2");
    expect(summarySource).toContain("min-h-11 w-full");
    expect(summarySource).toContain("Collapsible");
    expect(summarySource).toContain("aria-controls={contextId}");
    expect(summarySource).toContain("Contexto do cuidado e da Célula");
  });

  it("mantém estados da ficha compactos, acessíveis e acionáveis no celular", () => {
    expect(sectionStateSource).toContain('role={role}');
    expect(sectionStateSource).toContain('aria-live={kind === "error" ? "assertive" : "polite"}');
    expect(sectionStateSource).toContain('aria-busy={isBusy}');
    expect(sectionStateSource).toContain("min-h-11");
    expect(sectionStateSource).toContain('kind === "error" && onRetry');
    expect(sectionStateSource).toContain("focus-visible");
    expect(peopleSource).toContain("resolvePersonSectionState");
    expect(peopleSource).toContain("Atualizando participação");
    expect(sectionStateSource).not.toContain("overflow-x-");
  });

  it("usa um seletor compacto para trocar a única seção aberta da ficha no celular", () => {
    expect(peopleSource).toContain('aria-label="Navegação da ficha no celular"');
    expect(peopleSource).toContain('aria-label="Seção atual da ficha da Pessoa"');
    expect(peopleSource).toContain("min-h-11 w-full bg-background text-sm text-navy");
    expect(peopleSource).toContain('className={`hidden gap-1 rounded-xl bg-muted p-1 sm:grid');
    expect(peopleSource).toContain("const effectivePersonSection = resolvedRequestedSection ?? \"resumo\";");
    expect(peopleSource).toContain("PERSON_SECTION_OPTIONS.filter((option) => !option.pastoralOnly || canManagePastoralCoverage)");
    expect(peopleSource).toContain('navigate(nextLocation, { replace: true });');
    expect(peopleSource).toContain('role="tabpanel"');
    expect(peopleSource).toContain('id="person-section-content"');
    expect(peopleSource).toContain("Uma área por vez para manter a leitura simples.");
  });

  it("mantém a linha do tempo histórica compacta, acessível e progressiva", () => {
    expect(peopleSource).toContain("<PersonHistoryTimeline events={historyTimeline} />");
    expect(historySource).toContain("initialVisibleCount = 5");
    expect(historySource).toContain("min-w-0");
    expect(historySource).toContain("break-words");
    expect(historySource).toContain("aria-controls={listId}");
    expect(historySource).toContain("aria-expanded={expanded}");
    expect(historySource).toContain("min-h-11 w-full");
    expect(historySource).toContain("Ainda não há atividades históricas registradas");
    expect(historySource).toContain("Esta linha do tempo não substitui os estados atuais do Resumo.");
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
