import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const appSource = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");
const cellsSource = readFileSync(resolve(root, "client/src/pages/Celulas.tsx"), "utf8");

describe("Navegação sem aliases operacionais", () => {
  it("mantém Novas Almas em uma rota canônica e redireciona o alias legado", () => {
    expect(appSource).toContain('<Route path="/app/almas">');
    expect(appSource).toContain('<Redirect to="/app/almas" />');
    expect(appSource).not.toContain('<AppPage title="Novas Almas">\n          <GanharAlmas />\n        </AppPage>\n      </Route>\n\n      <Route path="/app/consolidacao">');
  });

  it("abre a rota Mapa de Células na visão de mapa do mesmo módulo", () => {
    expect(appSource).toContain('<Celulas initialTab="mapa" />');
    expect(cellsSource).toContain('type CelulasProps = { initialTab?: "lista" | "mapa" };');
    expect(cellsSource).toContain('const [activeTab, setActiveTab] = useState(initialTab);');
    expect(cellsSource).toContain('setActiveTab(initialTab);');
  });
});

// Ações de avanço da etapa principal permanecem protegidas no Funil; a ficha
// detalha progresso e histórico sem oferecer um segundo comando de mudança.
const funnelSource = readFileSync(resolve(root, "client/src/pages/FunilDiscipulado.tsx"), "utf8");
const peopleSource = readFileSync(resolve(root, "client/src/pages/Pessoas.tsx"), "utf8");

describe("Responsabilidade única da Jornada", () => {
  it("mantém Avançar/Retornar no Funil e remove Tornar atual da ficha", () => {
    expect(funnelSource).toContain("handleMoveForward");
    expect(funnelSource).toContain("handleMoveBackward");
    expect(peopleSource).toContain("A etapa principal é alterada em Acompanhamento da Jornada");
    expect(peopleSource).not.toContain("Tornar atual");
  });
});
