import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const pageSource = readFileSync(resolve(root, "client/src/pages/RadarEspiritual.tsx"), "utf8");
const appSource = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const radarSource = dbSource.slice(dbSource.indexOf("export async function getSpiritualRadarByChurch"), dbSource.indexOf("/** Encerra o responsável anterior", dbSource.indexOf("export async function getSpiritualRadarByChurch")));
const careQueueSource = dbSource.slice(dbSource.indexOf("export async function getCareAttentionByChurch"), dbSource.indexOf("export type SpiritualRadarPriority"));
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const designSource = readFileSync(resolve(root, "references/radar-espiritual-implementation.md"), "utf8");

describe("Fluxo estrutural do Radar Espiritual", () => {
  it("substitui o placeholder pela página dedicada", () => {
    expect(appSource).toContain('const RadarEspiritual = lazy(() => import("./pages/RadarEspiritual"));');
    expect(appSource).toContain('<RadarEspiritual />');
    expect(appSource).not.toContain('<Placeholder title="Radar Espiritual"');
  });

  it("oferece fila, prioridades, filtros, evidências e ações", () => {
    expect(pageSource).toContain("Fila de atenção");
    expect(pageSource).toContain("Pontuação");
    expect(pageSource).toContain("Filtrar por prioridade");
    expect(pageSource).toContain("Filtrar por sinal");
    expect(pageSource).toContain("nextAction");
    expect(pageSource).toContain("signal.evidence");
    expect(pageSource).toContain("Registrar contato");
    expect(pageSource).toContain("Central de Cuidado");
  });

  it("deixa explícito que sinais não são diagnóstico e protege a privacidade", () => {
    expect(pageSource).toContain("não diagnostica a vida espiritual");
    expect(pageSource).toContain("respeitam a responsabilidade pastoral");
    expect(dbSource).toContain("telefone, endereço, CPF, WhatsApp ou notas pastorais");
    expect(radarSource).not.toContain("phone: people.phone");
    expect(radarSource).not.toContain("whatsapp: people.whatsapp");
  });

  it("calcula sinais a partir do tenant e filtra o escopo da sessão", () => {
    expect(dbSource).toContain("getSpiritualRadarByChurch(churchId: number)");
    expect(dbSource).toContain("eq(people.churchId, churchId)");
    expect(dbSource).toContain("eq(careAssignments.churchId, churchId)");
    expect(dbSource).toContain("eq(careVisits.churchId, churchId)");
    expect(routerSource).toContain("const radarRouter = router({");
    expect(routerSource).toContain("await requireChurchMember(ctx.user.id, input.churchId)");
    expect(routerSource).toContain("getJourneyManagedPersonIds");
    expect(routerSource).toContain("radar: radarRouter");
  });

  it("não classifica Pastor com cobertura como sem responsável ou sem discipulador", () => {
    expect(radarSource).toContain("getPastorCandidatesByChurch(churchId)");
    expect(radarSource).toContain("eq(pastoralCoverages.churchId, churchId)");
    expect(radarSource).toContain("const hasPastoralCoverage = isPastor && coveredPastoralPersonIds.has(person.id);");
    expect(radarSource).toContain("if (!careAssignment && !hasPastoralCoverage)");
    expect(radarSource).toContain("if (!isPastor && stage <= 6 && !person.discipledById)");
    expect(radarSource).toContain("if (!isPastor && stage >= 2 && !cell)");
  });

  it("aplica a cobertura também à fila da Central de Cuidado", () => {
    expect(careQueueSource).toContain("getPastorCandidatesByChurch(churchId)");
    expect(careQueueSource).toContain("eq(pastoralCoverages.churchId, churchId)");
    expect(careQueueSource).toContain("const hasPastoralCoverage = isPastor && coveredPastoralPersonIds.has(person.id);");
    expect(careQueueSource).toContain("if (!careAssignment && !hasPastoralCoverage)");
    expect(careQueueSource).toContain("if (!isPastor && soul && !consolidation)");
    expect(careQueueSource).toContain("if (!isPastor && consolidation && !consolidation.callMade)");
  });

  it("documenta pontuação transparente e ações da primeira versão", () => {
    expect(designSource).toContain("Sinais da primeira versão");
    expect(designSource).toContain("pontuação é transparente");
    expect(designSource).toContain("Ações da primeira versão");
    expect(designSource).toContain("não serão usados como diagnóstico automático");
  });
});

export {};
