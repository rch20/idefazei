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

  it("mantém atribuição, vínculo de cuidado e histórico na mesma transação", () => {
    const start = dbSource.indexOf("export async function assignConsolidationCase");
    const end = dbSource.indexOf("export async function acceptConsolidationCase", start);
    const block = dbSource.slice(start, end);
    expect(block).toContain("return db.transaction(async (tx) => {");
    expect(block).toContain("assignedToPersonId: data.toPersonId");
    expect(block).toContain("acceptedByChurchUserId: null");
    expect(block).toContain("tx.update(careAssignments).set({ active: false, endedAt: now })");
    expect(block).toContain("tx.insert(consolidationCaseAssignments).values");
  });

  it("finaliza o caso e encerra o vínculo ativo de cuidado atomicamente", () => {
    const start = dbSource.indexOf("export async function finalizeConsolidationReferral");
    const end = dbSource.indexOf("export async function getConsolidationFollowUpsByReferral", start);
    const block = dbSource.slice(start, end);
    expect(block).toContain("return db.transaction(async (tx) => {");
    expect(block).toContain('status: data.status');
    expect(block).toContain("closeNotes: data.closeNotes");
    expect(block).toContain("tx.update(careAssignments).set({ active: false, endedAt: now })");
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
