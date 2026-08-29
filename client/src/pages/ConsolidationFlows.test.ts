import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const migrationSource = readFileSync(resolve(root, "drizzle/0035_awesome_richard_fisk.sql"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const consolidationSource = readFileSync(resolve(root, "client/src/pages/Consolidacao.tsx"), "utf8");
const leaderSource = readFileSync(resolve(root, "client/src/pages/AppLider.tsx"), "utf8");
const careSource = readFileSync(resolve(root, "client/src/pages/CentralCuidado.tsx"), "utf8");
const ministryPanelSource = readFileSync(resolve(root, "client/src/components/ConsolidationMinistryPanel.tsx"), "utf8");
const ministrySource = readFileSync(resolve(root, "client/src/pages/Ministerios.tsx"), "utf8");
const assignmentSource = readFileSync(resolve(root, "client/src/components/ConsolidationAssignmentControl.tsx"), "utf8");
const visitAssignmentSource = readFileSync(resolve(root, "client/src/components/VisitAssignmentControl.tsx"), "utf8");


describe("Fluxo estrutural do Ministério de Consolidação e Visitas", () => {
  it("mantém casos, histórico e Visitas com IDs e índices isolados por igreja", () => {
    expect(schemaSource).toContain('export const consolidationCaseAssignments = mysqlTable("consolidation_case_assignments"');
    expect(schemaSource).toContain('export const careVisits = mysqlTable("care_visits"');
    expect(schemaSource).toContain('export const careVisitEvents = mysqlTable("care_visit_events"');
    expect(migrationSource).toContain('CREATE TABLE `care_visits`');
    expect(migrationSource).toContain('CREATE INDEX `care_visit_queue_idx` ON `care_visits` (`churchId`,`status`,`scheduledAt`)');
    expect(migrationSource).toContain('CREATE INDEX `consolidation_referral_person_idx` ON `consolidation_referrals` (`churchId`,`personId`,`status`)');
  });

  it("expõe o Ministério de Consolidação e seus envolvidos com acesso derivado por igreja", () => {
    expect(schemaSource).toContain('"consolidacao"');
    expect(schemaSource).toContain('"visitas"');
    expect(routerSource).toContain("isActiveConsolidationMinistryMember");
    expect(routerSource).toContain("isActiveVisitsMinistryMember");
    expect(routerSource).toContain("acceptVisit");
    expect(dbSource).toContain("export async function isActiveConsolidationMinistryMember");
    expect(dbSource).toContain("export async function isActiveVisitsMinistryMember");
    expect(dbSource).toContain("export async function acceptCareVisit");
    expect(ministrySource).toContain('value="consolidacao"');
    expect(ministrySource).toContain('value="visitas"');
    expect(ministrySource).toContain("participantIds");
  });

  it("salva Líder e Supervisor com vínculos e funções em uma única transação", () => {
    expect(dbSource).toContain("export async function setConsolidationDepartmentLeadership");
    expect(dbSource).toContain("return db.transaction(async (tx) =>");
    expect(routerSource).toContain("setConsolidationDepartmentLeadership({ churchId: input.churchId");
    expect(routerSource).toContain("Somente Pastores podem definir Líder e Supervisor");
  });

  it("valida a origem da indicação e bloqueia Pessoa fora do escopo da liderança", () => {
    expect(routerSource).toContain("async function resolveReferralSource");
    expect(routerSource).toContain('sourceType: "celula" as const');
    expect(routerSource).toContain('sourceType: "ministerio" as const');
    expect(routerSource).toContain('sourceType: "departamento" as const');
    expect(routerSource).toContain("Você só pode indicar Pessoas vinculadas à sua Célula, Ministério ou Departamento.");
    expect(dbSource).toContain("Esta Pessoa já possui um caso ativo na Consolidação.");
  });

  it("permite aprovação pastoral pela conta da igreja mesmo sem personId", () => {
    expect(routerSource).toContain("if (!context.capabilities.canManageConsolidation)");
    expect(routerSource).toContain("approvedByPersonId: context.actor.personId ?? null");
    expect(routerSource).not.toContain("if (!context.capabilities.canManageConsolidation || !context.actor.personId)");
    expect(dbSource).toContain("approvedByPersonId: number | null");
  });

  it("expõe painéis responsivos, filtros e histórico sem criar modais aninhados", () => {
    expect(consolidationSource).toContain('caseFilter');
    expect(consolidationSource).toContain('visitFilter');
    expect(consolidationSource).toContain("<ConsolidationAssignmentControl");
    expect(consolidationSource).toContain("<VisitAssignmentControl");
    expect(assignmentSource).toContain("trpc.consolidation.assignmentHistory.useQuery");
    expect(visitAssignmentSource).toContain("visitId: visit.id");
    expect(consolidationSource).toContain("Aceitar visita");
    expect(ministryPanelSource).not.toContain("Ministério ID");
    expect(ministryPanelSource).not.toContain("<Dialog");
  });

  it("usa prioridade tipada no App do Líder e Visitas reais na Central de Cuidado", () => {
    expect(leaderSource).toContain('priority: "normal" | "alta" | "urgente"');
    expect(leaderSource).toContain('priority: referralByCell[myCell.id].priority ?? "normal"');
    expect(careSource).toContain("visit.id");
    expect(careSource).toContain("visit.caseReason");
    expect(routerSource).toContain("getCareVisitsByChurch(input.churchId)");
  });
});
