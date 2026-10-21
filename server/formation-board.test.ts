import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routers = readFileSync("server/routers.ts", "utf8");
const db = readFileSync("server/db.ts", "utf8");
const page = readFileSync("client/src/pages/FunilDiscipulado.tsx", "utf8");

describe("Painel da formação", () => {
  it("a consulta do painel exige perfil administrativo e lê o mesmo registro do Prontuário", () => {
    const start = routers.indexOf("journeyBoard:");
    expect(start).toBeGreaterThan(-1);
    expect(routers.slice(start, start + 400)).toContain("requireChurchAdministrator");
    expect(db).toContain("export async function getDiscipleshipProgressByChurch");
    expect(page).toContain("trpc.people.journeyBoard.useQuery");
    expect(page).toContain("trpc.people.updateJourneyStage.useMutation");
  });
  it("concluir uma etapa à frente move a etapa principal e nunca retrocede", () => {
    const start = db.indexOf("export async function upsertDiscipleshipStageProgress");
    const body = db.slice(start, start + 6000);
    expect(body).toContain('input.status === "concluida" && input.stage !== "celula"');
    expect(body).toContain("order.indexOf(input.stage) > currentIndex");
  });
  it("não impõe ordem entre as etapas e oferece filtros úteis", () => {
    expect(page).toContain("Encontro sem Batismo");
    expect(page).toContain("Tudo bem registrar o Encontro com Deus antes dele");
    expect(page).not.toMatch(/Avançar|Voltar etapa/);
  });
});
