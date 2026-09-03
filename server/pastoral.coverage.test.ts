import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");

describe("Cobertura espiritual pastoral — contrato e segurança", () => {
  it("exige exatamente o role pastor_presidente para administrar a cobertura", () => {
    expect(routerSource).toContain("async function requirePastorPresident");
    expect(routerSource).toContain('if (!roles.includes("pastor_presidente"))');
    expect(routerSource).toContain("Somente o Administrador Presidente pode administrar a cobertura espiritual.");
    expect(routerSource).toContain("savePastoralCoverage: protectedProcedure");
    expect(routerSource).toContain("removePastoralCoverage: protectedProcedure");
  });

  it("valida o Pastor alvo e o Pastor interno de cobertura dentro do mesmo tenant", () => {
    expect(routerSource).toContain("async function requirePastorPerson(churchId: number, personId: number)");
    expect(routerSource).toContain("getPastorCandidatesByChurch(input.churchId)");
    expect(routerSource).toContain("O Pastor de cobertura precisa pertencer a esta igreja e ter cargo pastoral ativo.");
    expect(routerSource).toContain("churchId: z.number().int().positive()");
    expect(dbSource).toContain("eq(churchMembers.churchId, churchId)");
    expect(dbSource).toContain("eq(churchUsers.churchId, churchId)");
    expect(dbSource).toContain("eq(pastoralCoverages.churchId, churchId)");
  });

  it("preserva histórico imutável em transação e não cria Pessoa paralela", () => {
    expect(schemaSource).toContain('mysqlTable("pastoral_coverages"');
    expect(schemaSource).toContain('mysqlTable("pastoral_coverage_events"');
    expect(schemaSource).toContain('uniqueIndex("pastoral_coverages_pastor_unique")');
    expect(schemaSource).toContain('["criada", "atualizada", "removida"]');
    expect(dbSource).toContain("const action = await db.transaction(async (tx)");
    expect(dbSource).toContain("await tx.insert(pastoralCoverageEvents)");
    expect(dbSource).toContain("await tx.delete(pastoralCoverages)");
    expect(dbSource).not.toContain("createPerson({ ...input, pastorPersonId");
  });

  it("mantém a cobertura separada do responsável interno pelo cuidado", () => {
    expect(readFileSync(resolve(root, "client/src/pages/Pessoas.tsx"), "utf8")).toContain("Esta relação é administrativa e não substitui o responsável interno pelo cuidado.");
    expect(routerSource).not.toContain("setCurrentCareAssignment({ ...input, covering");
    expect(dbSource).toContain("pastorPersonId");
    expect(dbSource).toContain("coveringPastorPersonId");
  });
});
