import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACTIVE_CONSOLIDATION_REFERRAL_STATUSES,
  getConsolidationResponsiblePersonId,
  hasConsolidationResponsible,
  isActiveConsolidationReferralStatus,
  isTerminalConsolidationReferralStatus,
} from "../shared/consolidation";

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

const dbSource = compactSource(
  readFileSync(resolve(__dirname, "db.ts"), "utf8")
);
const routersSource = compactSource(
  readFileSync(resolve(__dirname, "routers.ts"), "utf8")
);

function routerBlock(name: string, nextName: string) {
  const start = routersSource.indexOf(`const ${name} = router({`);
  const end = routersSource.indexOf(`const ${nextName} = router({`, start + 1);
  expect(
    start,
    `${name} precisa existir em server/routers.ts`
  ).toBeGreaterThanOrEqual(0);
  expect(end, `${nextName} precisa existir depois de ${name}`).toBeGreaterThan(
    start
  );
  return routersSource.slice(start, end);
}

describe("Governança de casos modernos de Consolidação", () => {
  it("mantém uma única definição compartilhada de estados ativos e terminais", () => {
    expect(ACTIVE_CONSOLIDATION_REFERRAL_STATUSES).toEqual([
      "pendente",
      "aprovado",
      "aceito",
      "em_acompanhamento",
    ]);
    expect(isActiveConsolidationReferralStatus("em_acompanhamento")).toBe(true);
    expect(isActiveConsolidationReferralStatus("cancelado")).toBe(false);
    expect(isTerminalConsolidationReferralStatus("encerrado")).toBe(true);
    expect(isTerminalConsolidationReferralStatus("pendente")).toBe(false);
  });

  it("trata atribuição pessoal e responsável pastoral por conta como formas explícitas de responsabilidade", () => {
    expect(
      getConsolidationResponsiblePersonId({
        assignedToPersonId: 10,
        acceptedByPersonId: 12,
      })
    ).toBe(10);
    expect(
      getConsolidationResponsiblePersonId({
        assignedToPersonId: null,
        acceptedByPersonId: 12,
      })
    ).toBe(12);
    expect(
      getConsolidationResponsiblePersonId({ acceptedByChurchUserId: 77 })
    ).toBeNull();
    expect(hasConsolidationResponsible({ acceptedByChurchUserId: 77 })).toBe(
      true
    );
    expect(
      hasConsolidationResponsible({
        assignedToPersonId: null,
        acceptedByPersonId: null,
        acceptedByChurchUserId: null,
      })
    ).toBe(false);
  });

  it("protege a criação contra dois casos ativos concorrentes", () => {
    expect(dbSource).toContain(compactSource(".from(people)"));
    expect(dbSource).toContain(compactSource('.for("update")'));
    expect(dbSource).toContain(
      compactSource("activeConsolidationReferralCondition()")
    );
    expect(dbSource).toContain(
      compactSource("Esta Pessoa já possui um caso ativo na Consolidação.")
    );
  });

  it("mantém atribuição e histórico do caso na mesma transação, sem substituir o discipulador", () => {
    const start = dbSource.indexOf(
      "export async function assignConsolidationCase"
    );
    const end = dbSource.indexOf(
      "export async function acceptConsolidationCase",
      start
    );
    const block = dbSource.slice(start, end);
    expect(block).toContain(
      compactSource("return db.transaction(async (tx) => {")
    );
    expect(block).toContain(
      compactSource("assignedToPersonId: data.toPersonId")
    );
    expect(block).toContain(compactSource("acceptedByChurchUserId: null"));
    expect(block).toContain(
      compactSource("tx.insert(consolidationCaseAssignments).values")
    );
    expect(block).not.toContain(compactSource("tx.update(careAssignments)"));
  });

  it("finaliza o caso sem encerrar o vínculo de discipulador", () => {
    const start = dbSource.indexOf(
      "export async function finalizeConsolidationReferral"
    );
    const end = dbSource.indexOf(
      "export async function getConsolidationFollowUpsByReferral",
      start
    );
    const block = dbSource.slice(start, end);
    expect(block).toContain(
      compactSource("return db.transaction(async (tx) => {")
    );
    expect(block).toContain(compactSource("status: data.status"));
    expect(block).toContain(compactSource("closeNotes: data.closeNotes"));
    expect(block).not.toContain(compactSource("tx.update(careAssignments)"));
  });

  it("não deixa aceite, assunção ou integração em Célula substituir o cuidado principal", () => {
    const blocks = [
      ["acceptConsolidationCase", "assumeConsolidationCaseByChurchUser"],
      ["assumeConsolidationCaseByChurchUser", "approveConsolidationCase"],
      ["integrateConsolidationReferralIntoCell", "// ─── EVENTS"],
    ].map(([name, nextName]) => {
      const start = dbSource.indexOf(`export async function ${name}`);
      const end = dbSource.indexOf(
        nextName.startsWith("//")
          ? nextName
          : `export async function ${nextName}`,
        start
      );
      expect(start, `${name} precisa existir`).toBeGreaterThanOrEqual(0);
      expect(end, `${name} precisa ter fim identificável`).toBeGreaterThan(
        start
      );
      return dbSource.slice(start, end);
    });

    for (const block of blocks) {
      expect(block).not.toContain(compactSource("tx.update(careAssignments)"));
      expect(block).not.toContain(compactSource("tx.insert(careAssignments)"));
    }
  });

  it("define o discipulador em operação própria, com lock e histórico por papel", () => {
    const start = dbSource.indexOf("export async function setPrimaryDiscipler");
    const end = dbSource.indexOf(
      "export async function findPossiblePeopleByIdentity",
      start
    );
    const block = dbSource.slice(start, end);
    expect(block).toContain(
      compactSource("return db.transaction(async (tx) => {")
    );
    expect(block).toContain(compactSource('.for("update")'));
    expect(block).toContain(
      compactSource('eq(careAssignments.role, "discipulador")')
    );
    expect(block).toContain(
      compactSource("discipledById: data.disciplerPersonId")
    );
    expect(block).toContain(
      compactSource("data.disciplerPersonId === data.personId")
    );
  });

  it("mantém o helper legado limitado ao papel solicitado", () => {
    const start = dbSource.indexOf(
      "export async function setCurrentCareAssignment"
    );
    const end = dbSource.indexOf("// ─── CONSOLIDATIONS", start);
    const block = dbSource.slice(start, end);
    expect(block).toContain(
      compactSource("eq(careAssignments.role, data.role)")
    );
  });

  it("mantém o discipulador fora da consulta de cuidado operacional", () => {
    const start = dbSource.indexOf(
      "export async function getCurrentOperationalCareAssignment"
    );
    const end = dbSource.indexOf(
      "export async function getCareHistoryByPerson",
      start
    );
    const block = dbSource.slice(start, end);
    expect(block).toContain(
      compactSource('ne(careAssignments.role, "discipulador")')
    );
    expect(routersSource).toContain(
      compactSource(
        "return getCurrentOperationalCareAssignment(input.personId, input.churchId);"
      )
    );
  });

  it("projeta os vínculos operacionais e o discipulador principal separadamente na fila", () => {
    const start = dbSource.indexOf(
      "export async function getCareAttentionByChurch"
    );
    const end = dbSource.indexOf("export type SpiritualRadarPriority", start);
    const block = dbSource.slice(start, end);
    expect(block).toContain(compactSource("careAssignmentsByPerson"));
    expect(block).toContain(
      compactSource("careAssignments: enrichedCareAssignments")
    );
    expect(block).toContain(compactSource("primaryDiscipler"));
    expect(block).toContain(compactSource("responsiblePersonName"));
    expect(block).toContain(
      compactSource(
        'const leftRoleRank = left.role === "discipulador" ? 1 : 0;'
      )
    );
    expect(block).toContain(
      compactSource(
        "return rightStartedAt - leftStartedAt || right.id - left.id;"
      )
    );
  });

  it("inclui o discipulador principal no escopo pastoral da própria Pessoa", () => {
    const permissionStart = dbSource.indexOf(
      "export async function canChurchUserManageJourney"
    );
    const managedStart = dbSource.indexOf(
      "export async function getJourneyManagedPersonIds"
    );
    const permissionBlock = dbSource.slice(permissionStart, managedStart);
    const managedBlock = dbSource.slice(
      managedStart,
      dbSource.indexOf(
        "export async function getActiveSuperAdminById",
        managedStart
      )
    );
    expect(permissionBlock).toContain(
      compactSource("eq(people.discipledById, input.actorPersonId)")
    );
    expect(permissionBlock).toContain(
      compactSource("eq(people.churchId, input.churchId)")
    );
    expect(permissionBlock).toContain(compactSource("eq(people.active, true)"));
    expect(managedBlock).toContain(
      compactSource("eq(people.discipledById, input.actorPersonId)")
    );
    expect(managedBlock).toContain(
      compactSource("eq(people.churchId, input.churchId)")
    );
    expect(managedBlock).toContain(compactSource("eq(people.active, true)"));
  });

  it("expõe uma mutation explícita e remove discipledById dos CRUDs genéricos", () => {
    const block = routerBlock("peopleRouter", "soulsRouter");
    expect(block).toContain(
      compactSource("setPrimaryDiscipler: protectedProcedure")
    );
    expect(block).toContain(
      compactSource(
        "requirePrimaryDisciplerPermission(ctx.user.id, input.churchId)"
      )
    );
    expect(block).not.toContain(
      compactSource("discipledById: z.number().optional()")
    );
  });

  it("usa o referral como autoridade do responsável e não a preferência como atribuição ativa", () => {
    const block = routerBlock("consolidationRouter", "careRouter");
    expect(block).toContain(
      compactSource(
        "if (referral.assignedToPersonId && referral.assignedToPersonId !== actor.personId)"
      )
    );
    expect(block).toContain(
      compactSource("finalizeConsolidationReferral({ churchId: input.churchId")
    );
    expect(routersSource).toContain(
      compactSource(
        "const unassignedCases = activeCases.filter((referral) => !hasConsolidationResponsible(referral));"
      )
    );
    expect(block).not.toContain(
      compactSource(
        "referral.preferredConsolidatorId) && (referral.assignedToPersonId ?? referral.preferredConsolidatorId)"
      )
    );
  });

  it("preserva o isolamento por churchId nos casos e no histórico", () => {
    const block = routerBlock("consolidationRouter", "careRouter");
    expect(block).toContain(
      compactSource(
        "getConsolidationReferralById(input.referralId, input.churchId)"
      )
    );
    expect(block).toContain(
      compactSource(
        "getConsolidationCaseAssignments(input.referralId, input.churchId)"
      )
    );
    expect(block).toContain(
      compactSource(
        "getConsolidationFollowUpsByReferral(input.referralId, input.churchId)"
      )
    );
  });
});
