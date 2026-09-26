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

const dbSource = readFileSync(resolve(__dirname, "db.ts"), "utf8");
const routersSource = readFileSync(resolve(__dirname, "routers.ts"), "utf8");

function routerBlock(name: string, nextName: string) {
  const start = routersSource.indexOf(`const ${name} = router({`);
  const end = routersSource.indexOf(`const ${nextName} = router({`, start + 1);
  expect(start, `${name} precisa existir em server/routers.ts`).toBeGreaterThanOrEqual(0);
  expect(end, `${nextName} precisa existir depois de ${name}`).toBeGreaterThan(start);
  return routersSource.slice(start, end);
}

describe("Governança de casos modernos de Consolidação", () => {
  it("mantém uma única definição compartilhada de estados ativos e terminais", () => {
    expect(ACTIVE_CONSOLIDATION_REFERRAL_STATUSES).toEqual(["pendente", "aprovado", "aceito", "em_acompanhamento"]);
    expect(isActiveConsolidationReferralStatus("em_acompanhamento")).toBe(true);
    expect(isActiveConsolidationReferralStatus("cancelado")).toBe(false);
    expect(isTerminalConsolidationReferralStatus("encerrado")).toBe(true);
    expect(isTerminalConsolidationReferralStatus("pendente")).toBe(false);
  });

  it("trata atribuição pessoal e responsável pastoral por conta como formas explícitas de responsabilidade", () => {
    expect(getConsolidationResponsiblePersonId({ assignedToPersonId: 10, acceptedByPersonId: 12 })).toBe(10);
    expect(getConsolidationResponsiblePersonId({ assignedToPersonId: null, acceptedByPersonId: 12 })).toBe(12);
    expect(getConsolidationResponsiblePersonId({ acceptedByChurchUserId: 77 })).toBeNull();
    expect(hasConsolidationResponsible({ acceptedByChurchUserId: 77 })).toBe(true);
    expect(hasConsolidationResponsible({ assignedToPersonId: null, acceptedByPersonId: null, acceptedByChurchUserId: null })).toBe(false);
  });

  it("protege a criação contra dois casos ativos concorrentes", () => {
    expect(dbSource).toContain(".from(people)");
    expect(dbSource).toContain(".for(\"update\")");
    expect(dbSource).toContain("activeConsolidationReferralCondition()");
    expect(dbSource).toContain("Esta Pessoa já possui um caso ativo na Consolidação.");
  });

  it("mantém atribuição e histórico do caso na mesma transação, sem substituir o discipulador", () => {
    const start = dbSource.indexOf("export async function assignConsolidationCase");
    const end = dbSource.indexOf("export async function acceptConsolidationCase", start);
    const block = dbSource.slice(start, end);
    expect(block).toContain("return db.transaction(async (tx) => {");
    expect(block).toContain("assignedToPersonId: data.toPersonId");
    expect(block).toContain("acceptedByChurchUserId: null");
    expect(block).toContain("tx.insert(consolidationCaseAssignments).values");
    expect(block).not.toContain("tx.update(careAssignments)");
  });

  it("finaliza o caso sem encerrar o vínculo de discipulador", () => {
    const start = dbSource.indexOf("export async function finalizeConsolidationReferral");
    const end = dbSource.indexOf("export async function getConsolidationFollowUpsByReferral", start);
    const block = dbSource.slice(start, end);
    expect(block).toContain("return db.transaction(async (tx) => {");
    expect(block).toContain('status: data.status');
    expect(block).toContain('closeNotes: data.closeNotes');
    expect(block).not.toContain("tx.update(careAssignments)");
  });

  it("não deixa aceite, assunção ou integração em Célula substituir o cuidado principal", () => {
    const blocks = [
      ["acceptConsolidationCase", "assumeConsolidationCaseByChurchUser"],
      ["assumeConsolidationCaseByChurchUser", "approveConsolidationCase"],
      ["integrateConsolidationReferralIntoCell", "// ─── EVENTS"],
    ].map(([name, nextName]) => {
      const start = dbSource.indexOf(`export async function ${name}`);
      const end = dbSource.indexOf(nextName.startsWith("//") ? nextName : `export async function ${nextName}`, start);
      expect(start, `${name} precisa existir`).toBeGreaterThanOrEqual(0);
      expect(end, `${name} precisa ter fim identificável`).toBeGreaterThan(start);
      return dbSource.slice(start, end);
    });

    for (const block of blocks) {
      expect(block).not.toContain("tx.update(careAssignments)");
      expect(block).not.toContain("tx.insert(careAssignments)");
    }
  });

  it("define o discipulador em operação própria, com lock e histórico por papel", () => {
    const start = dbSource.indexOf("export async function setPrimaryDiscipler");
    const end = dbSource.indexOf("export async function findPossiblePeopleByIdentity", start);
    const block = dbSource.slice(start, end);
    expect(block).toContain("return db.transaction(async (tx) => {");
    expect(block).toContain('.for("update")');
    expect(block).toContain("eq(careAssignments.role, \"discipulador\")");
    expect(block).toContain("discipledById: data.disciplerPersonId");
    expect(block).toContain("data.disciplerPersonId === data.personId");
  });

  it("mantém o helper legado limitado ao papel solicitado", () => {
    const start = dbSource.indexOf("export async function setCurrentCareAssignment");
    const end = dbSource.indexOf("// ─── CONSOLIDATIONS", start);
    const block = dbSource.slice(start, end);
    expect(block).toContain("eq(careAssignments.role, data.role)");
  });

  it("mantém o discipulador fora da consulta de cuidado operacional", () => {
    const start = dbSource.indexOf("export async function getCurrentOperationalCareAssignment");
    const end = dbSource.indexOf("export async function getCareHistoryByPerson", start);
    const block = dbSource.slice(start, end);
    expect(block).toContain('ne(careAssignments.role, "discipulador")');
    expect(routersSource).toContain("return getCurrentOperationalCareAssignment(input.personId, input.churchId);");
  });

  it("projeta os vínculos operacionais e o discipulador principal separadamente na fila", () => {
    const start = dbSource.indexOf("export async function getCareAttentionByChurch");
    const end = dbSource.indexOf("export type SpiritualRadarPriority", start);
    const block = dbSource.slice(start, end);
    expect(block).toContain("careAssignmentsByPerson");
    expect(block).toContain("careAssignments: enrichedCareAssignments");
    expect(block).toContain("primaryDiscipler");
    expect(block).toContain("responsiblePersonName");
    expect(block).toContain('const leftRoleRank = left.role === "discipulador" ? 1 : 0;');
    expect(block).toContain("return rightStartedAt - leftStartedAt || right.id - left.id;");
  });

  it("inclui o discipulador principal no escopo pastoral da própria Pessoa", () => {
    const permissionStart = dbSource.indexOf("export async function canChurchUserManageJourney");
    const managedStart = dbSource.indexOf("export async function getJourneyManagedPersonIds");
    const permissionBlock = dbSource.slice(permissionStart, managedStart);
    const managedBlock = dbSource.slice(managedStart, dbSource.indexOf("export async function getActiveSuperAdminById", managedStart));
    expect(permissionBlock).toContain("eq(people.discipledById, input.actorPersonId)");
    expect(permissionBlock).toContain("eq(people.churchId, input.churchId)");
    expect(permissionBlock).toContain("eq(people.active, true)");
    expect(managedBlock).toContain("eq(people.discipledById, input.actorPersonId)");
    expect(managedBlock).toContain("eq(people.churchId, input.churchId)");
    expect(managedBlock).toContain("eq(people.active, true)");
  });

  it("expõe uma mutation explícita e remove discipledById dos CRUDs genéricos", () => {
    const block = routerBlock("peopleRouter", "soulsRouter");
    expect(block).toContain("setPrimaryDiscipler: protectedProcedure");
    expect(block).toContain("requirePrimaryDisciplerPermission(ctx.user.id, input.churchId)");
    expect(block).not.toContain("discipledById: z.number().optional()");
  });

  it("usa o referral como autoridade do responsável e não a preferência como atribuição ativa", () => {
    const block = routerBlock("consolidationRouter", "careRouter");
    expect(block).toContain("if (referral.assignedToPersonId && referral.assignedToPersonId !== actor.personId)");
    expect(block).toContain("finalizeConsolidationReferral({ churchId: input.churchId");
    expect(routersSource).toContain("const unassignedCases = activeCases.filter((referral) => !hasConsolidationResponsible(referral));");
    expect(block).not.toContain("referral.preferredConsolidatorId) && (referral.assignedToPersonId ?? referral.preferredConsolidatorId)");
  });

  it("preserva o isolamento por churchId nos casos e no histórico", () => {
    const block = routerBlock("consolidationRouter", "careRouter");
    expect(block).toContain("getConsolidationReferralById(input.referralId, input.churchId)");
    expect(block).toContain("getConsolidationCaseAssignments(input.referralId, input.churchId)");
    expect(block).toContain("getConsolidationFollowUpsByReferral(input.referralId, input.churchId)");
  });
});
