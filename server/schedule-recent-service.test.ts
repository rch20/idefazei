import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const db = readFileSync("server/db.ts", "utf8");
const routers = readFileSync("server/routers.ts", "utf8");
const page = readFileSync("client/src/pages/Escalas.tsx", "utf8");

describe("Escalas: grupos inteiros, turnos e aviso de serviço recente", () => {
  it("permite escalar o ministério inteiro sem departamento", () => {
    expect(db).toContain("data.departmentId ? \"Este Departamento ainda não possui participantes ativos.\" : \"Este Ministério ainda não possui participantes ativos.\"");
    expect(routers).toContain("departmentId: z.number().int().positive().nullable().optional()");
  });
  it("expõe a consulta de serviço recente", () => {
    expect(routers).toContain("recentService: protectedProcedure");
    expect(db).toContain("export async function getRecentServiceBefore");
  });
  it("mostra turnos rápidos e exige ciência explícita", () => {
    expect(page).toContain("Turno rápido");
    expect(page).toContain("Atenção: este grupo já serviu recentemente");
    expect(page).toContain("Estou ciente e quero escalar mesmo assim");
    expect(page).toContain("recentServiceBlocked");
  });
});
