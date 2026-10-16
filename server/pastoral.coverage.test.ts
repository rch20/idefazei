import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const compactSource = (source: string) =>
  source
    .replace(/\s+/g, " ")
    .replace(/\basync\s+\(\s*([A-Za-z_$][\w$]*)\s*\)/g, "async $1")
    .replace(/\(\s*([A-Za-z_$][\w$]*)\s*\)\s*=>/g, "$1 =>")
    .replace(/\s+\./g, ".")
    .replace(/\.\s+/g, ".")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/,\s*}/g, "}")
    .replace(/\s+}/g, "}")
    .trim();
const routerSource = compactSource(
  readFileSync(resolve(root, "server/routers.ts"), "utf8")
);
const dbSource = compactSource(
  readFileSync(resolve(root, "server/db.ts"), "utf8")
);
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");

describe("Cobertura espiritual pastoral — contrato e segurança", () => {
  it("exige exatamente o role pastor_presidente para administrar a cobertura", () => {
    expect(routerSource).toContain(
      compactSource("async function requirePastorPresident")
    );
    expect(routerSource).toContain('if (!roles.includes("pastor_presidente"))');
    expect(routerSource).toContain(
      compactSource(
        "Somente o Administrador Presidente pode administrar a cobertura espiritual."
      )
    );
    expect(routerSource).toContain(
      compactSource("pastoralCoverage: protectedProcedure")
    );
    expect(routerSource).toContain(
      compactSource(
        "const isPastor = (await getPastorCandidatesByChurch(input.churchId)).some"
      )
    );
    expect(routerSource).toContain(
      compactSource("isPastor: false, coverage: null, events: []")
    );
    expect(routerSource).toContain(
      compactSource("savePastoralCoverage: protectedProcedure")
    );
  });

  it("valida o Pastor alvo e o Pastor interno de cobertura dentro do mesmo tenant", () => {
    expect(routerSource).toContain(
      compactSource(
        "async function requirePastorPerson(churchId: number, personId: number)"
      )
    );
    expect(routerSource).toContain(
      compactSource("getPastorCandidatesByChurch(input.churchId)")
    );
    expect(routerSource).toContain(
      compactSource(
        "O Pastor de cobertura precisa pertencer a esta igreja e ter cargo pastoral ativo."
      )
    );
    expect(routerSource).toContain(
      compactSource("churchId: z.number().int().positive()")
    );
    expect(dbSource).toContain(
      compactSource("eq(churchMembers.churchId, churchId)")
    );
    expect(dbSource).toContain(
      compactSource("eq(churchUsers.churchId, churchId)")
    );
    expect(dbSource).toContain(
      compactSource("eq(pastoralCoverages.churchId, churchId)")
    );
  });

  it("preserva histórico imutável em transação e não cria Pessoa paralela", () => {
    expect(schemaSource).toContain('mysqlTable("pastoral_coverages"');
    expect(schemaSource).toContain('mysqlTable("pastoral_coverage_events"');
    expect(schemaSource).toContain(
      'uniqueIndex("pastoral_coverages_pastor_unique")'
    );
    expect(schemaSource).toContain('["criada", "atualizada", "removida"]');
    expect(dbSource).toContain(
      compactSource("const action = await db.transaction(async (tx)")
    );
    expect(dbSource).toContain(
      compactSource("await tx.insert(pastoralCoverageEvents)")
    );
    expect(dbSource).toContain(
      compactSource("await tx.delete(pastoralCoverages)")
    );
    expect(dbSource).not.toContain(
      compactSource("createPerson({ ...input, pastorPersonId")
    );
  });

  it("mantém a cobertura separada do responsável interno pelo cuidado", () => {
    expect(
      readFileSync(resolve(root, "client/src/pages/Pessoas.tsx"), "utf8")
    ).toContain(
      "Esta relação é administrativa e não substitui o responsável interno pelo cuidado."
    );
    expect(routerSource).not.toContain(
      compactSource("setCurrentCareAssignment({ ...input, covering")
    );
    expect(dbSource).toContain(compactSource("pastorPersonId"));
    expect(dbSource).toContain(compactSource("coveringPastorPersonId"));
  });
});
