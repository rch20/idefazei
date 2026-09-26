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

  it("permite aprovação pastoral opcional e aceite direto por Consolidadora oficial", () => {
    expect(routerSource).toContain("if (!context.capabilities.canManageConsolidation)");
    expect(routerSource).toContain("approvedByPersonId: context.actor.personId ?? null");
    expect(routerSource).not.toContain("if (!context.capabilities.canManageConsolidation || !context.actor.personId)");
    expect(routerSource).toContain('["pendente", "aprovado"].includes(referral.status)');
    expect(routerSource).toContain("(!referral.assignedToPersonId || referral.assignedToPersonId === actor.personId)");
    expect(consolidationSource).toContain("Um Consolidador oficialmente atribuído pode assumir diretamente");
    expect(consolidationSource).not.toContain("Aprovação pastoral</span>");
    expect(consolidationSource).toContain("2. Assunção ou triagem");
    expect(consolidationSource).not.toContain("Aguardando aprovação pastoral");
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

  it("mantém os cards modernos minimalistas com uma ação principal e detalhes progressivos", () => {
    expect(consolidationSource).toContain("expandedReferralId");
    expect(consolidationSource).toContain("getPrimaryReferralAction");
    expect(consolidationSource).toContain("const primaryAction =");
    expect(consolidationSource).toContain('const canRecordFollowUp = referral.status === "aceito" || referral.status === "em_acompanhamento";');
    expect(consolidationSource).toContain('return "details";');
    expect(consolidationSource).toContain("Registrar acompanhamento");
    expect(consolidationSource).toContain("Ver detalhes");
    expect(consolidationSource).toContain("Ações secundárias, histórico e próximos passos");
    expect(consolidationSource).toContain("id={`referral-details-${referral.id}`}");
  });

  it("preserva o contexto vindo da ficha e oferece retorno direto para a Pessoa", () => {
    expect(consolidationSource).toContain('const [location, navigate] = useLocation();');
    expect(consolidationSource).toContain('const focusPersonId = Number(routeParams.get("personId"));');
    expect(consolidationSource).toContain('const fromPeople = routeParams.get("from") === "pessoas"');
    expect(consolidationSource).toContain("const focusedReferral = fromPeople ? allReferrals.find((referral) => referral.personId === focusPersonId)");
    expect(consolidationSource).toContain("const focusedLegacy = fromPeople ? (consolidations ?? []).find");
    expect(consolidationSource).toContain("setExpandedReferralId(focusedReferral.id)");
    expect(consolidationSource).toContain("setLegacyHistoryOpen(true)");
    expect(consolidationSource).toContain("consolidation-referral-${focusedReferral.id}");
    expect(consolidationSource).toContain("legacy-consolidation-${focusedLegacy.id}");
    expect(consolidationSource).toContain("Voltar à ficha");
    expect(consolidationSource).toContain("O registro relacionado foi destacado");
  });

  it("deixa claro quando a ação principal apenas abre a escolha de Célula", () => {
    expect(consolidationSource).toContain("Escolher Célula");
    expect(consolidationSource).toContain("aria-expanded={isExpanded}");
    expect(consolidationSource).toContain("getReferralQueueEmptyMessage(caseFilter)");
    expect(consolidationSource).toContain("Não há casos aguardando responsável neste momento.");
    expect(consolidationSource).toContain("Não há casos com prazo vencido neste momento.");
  });

  it("usa prioridade tipada no App do Líder e Visitas reais na Central de Cuidado", () => {
    expect(leaderSource).toContain('priority: "normal" | "alta" | "urgente"');
    expect(leaderSource).toContain('priority: referralByCell[myCell.id].priority ?? "normal"');
    expect(careSource).toContain("visit.id");
    expect(careSource).toContain("visit.caseReason");
    expect(routerSource).toContain("getCareVisitsByChurch(input.churchId)");
  });

  it("torna o encerramento e a integração em Célula decisões explícitas da jornada", () => {
    expect(routerSource).toContain('if (referral.status !== "em_acompanhamento")');
    expect(routerSource).toContain("getConsolidationFollowUpsByReferral(input.id, input.churchId)");
    expect(routerSource).toContain("integrateReferralIntoCell");
    expect(dbSource).toContain("export async function integrateConsolidationReferralIntoCell");
    expect(dbSource).toContain('status: "encerrado"');
    const integrationStart = dbSource.indexOf("export async function integrateConsolidationReferralIntoCell");
    const integrationEnd = dbSource.indexOf("// ─── EVENTS", integrationStart);
    const integrationBlock = dbSource.slice(integrationStart, integrationEnd);
    expect(integrationBlock).toContain('status: "encerrado"');
    expect(integrationBlock).not.toContain("Cuidado transferido após integração");
    expect(integrationBlock).not.toContain("tx.insert(careAssignments)");
    expect(consolidationSource).toContain("Próximo destino da Pessoa");
    expect(consolidationSource).toContain("Concluir e integrar");
    expect(consolidationSource).toContain("Histórico legado de Consolidação");
    expect(consolidationSource).toContain("A fila moderna de cuidado está na seção acima");
  });

  it("usa o histórico moderno para o primeiro acompanhamento e preserva o legado apenas como compatibilidade", () => {
    expect(routerSource).toContain("recordModernFirstContact");
    expect(dbSource).toContain("export async function recordModernFirstContact");
    expect(careSource).toContain("Primeiro acompanhamento registrado no histórico da Consolidação.");
    expect(careSource).toContain("Registrar primeiro acompanhamento");
    expect(leaderSource).toContain('href="/app/consolidacao"');
  });

  it("fecha os estados finais com cancelamento e bloqueia finalização com visita aberta", () => {
    expect(routerSource).toContain("getOpenCareVisitsByReferral");
    expect(routerSource).toContain("cancelReferral");
    expect(routerSource).toContain("Conclua ou cancele as visitas abertas antes de encerrar este acompanhamento.");
    expect(dbSource).toContain("Conclua ou cancele as visitas abertas antes de integrar esta Pessoa em uma Célula.");
    expect(routerSource).toContain("Somente a Consolidadora responsável, o Pastor responsável ou a liderança gestora da Consolidação pode registrar este acompanhamento.");
    expect(consolidationSource).toContain('value="cancelados"');
    expect(consolidationSource).toContain("Cancelar caso");
    expect(consolidationSource).toContain("Checklist histórico");
    expect(consolidationSource).toContain("casos modernos de cuidado");
    expect(consolidationSource).not.toContain("toggleItem(c.id, item.key, checked)");
  });
});
