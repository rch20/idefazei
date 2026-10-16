import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

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

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const schemaSource = compactSource(
  readFileSync(resolve(root, "drizzle/schema.ts"), "utf8")
);
const migrationSource = compactSource(
  readFileSync(resolve(root, "drizzle/0035_awesome_richard_fisk.sql"), "utf8")
);
const routerSource = compactSource(
  readFileSync(resolve(root, "server/routers.ts"), "utf8")
);
const dbSource = compactSource(
  readFileSync(resolve(root, "server/db.ts"), "utf8")
);
const consolidationSource = compactSource(
  readFileSync(resolve(root, "client/src/pages/Consolidacao.tsx"), "utf8")
);
const leaderSource = compactSource(
  readFileSync(resolve(root, "client/src/pages/AppLider.tsx"), "utf8")
);
const careSource = compactSource(
  readFileSync(resolve(root, "client/src/pages/CentralCuidado.tsx"), "utf8")
);
const ministryPanelSource = compactSource(
  readFileSync(
    resolve(root, "client/src/components/ConsolidationMinistryPanel.tsx"),
    "utf8"
  )
);
const ministrySource = compactSource(
  readFileSync(resolve(root, "client/src/pages/Ministerios.tsx"), "utf8")
);
const assignmentSource = compactSource(
  readFileSync(
    resolve(root, "client/src/components/ConsolidationAssignmentControl.tsx"),
    "utf8"
  )
);
const visitAssignmentSource = compactSource(
  readFileSync(
    resolve(root, "client/src/components/VisitAssignmentControl.tsx"),
    "utf8"
  )
);

describe("Fluxo estrutural do Ministério de Consolidação e Visitas", () => {
  it("mantém casos, histórico e Visitas com IDs e índices isolados por igreja", () => {
    expect(schemaSource).toContain(
      compactSource(
        'export const consolidationCaseAssignments = mysqlTable("consolidation_case_assignments"'
      )
    );
    expect(schemaSource).toContain(
      compactSource('export const careVisits = mysqlTable("care_visits"')
    );
    expect(schemaSource).toContain(
      compactSource(
        'export const careVisitEvents = mysqlTable("care_visit_events"'
      )
    );
    expect(migrationSource).toContain(
      compactSource("CREATE TABLE `care_visits`")
    );
    expect(migrationSource).toContain(
      compactSource(
        "CREATE INDEX `care_visit_queue_idx` ON `care_visits` (`churchId`,`status`,`scheduledAt`)"
      )
    );
    expect(migrationSource).toContain(
      compactSource(
        "CREATE INDEX `consolidation_referral_person_idx` ON `consolidation_referrals` (`churchId`,`personId`,`status`)"
      )
    );
  });

  it("expõe o Ministério de Consolidação e seus envolvidos com acesso derivado por igreja", () => {
    expect(schemaSource).toContain(compactSource('"consolidacao"'));
    expect(schemaSource).toContain(compactSource('"visitas"'));
    expect(routerSource).toContain(
      compactSource("isActiveConsolidationMinistryMember")
    );
    expect(routerSource).toContain(
      compactSource("isActiveVisitsMinistryMember")
    );
    expect(routerSource).toContain(compactSource("acceptVisit"));
    expect(dbSource).toContain(
      compactSource("export async function isActiveConsolidationMinistryMember")
    );
    expect(dbSource).toContain(
      compactSource("export async function isActiveVisitsMinistryMember")
    );
    expect(dbSource).toContain(
      compactSource("export async function acceptCareVisit")
    );
    expect(ministrySource).toContain(compactSource('value="consolidacao"'));
    expect(ministrySource).toContain(compactSource('value="visitas"'));
    expect(ministrySource).toContain(compactSource("participantIds"));
  });

  it("salva Líder e Supervisor com vínculos e funções em uma única transação", () => {
    expect(dbSource).toContain(
      compactSource(
        "export async function setConsolidationDepartmentLeadership"
      )
    );
    expect(dbSource).toContain(
      compactSource("return db.transaction(async (tx) =>")
    );
    expect(routerSource).toContain(
      compactSource(
        "setConsolidationDepartmentLeadership({ churchId: input.churchId"
      )
    );
    expect(routerSource).toContain(
      compactSource(
        "Somente a administração autorizada pode definir Líder e Supervisor"
      )
    );
  });

  it("valida a origem da indicação e bloqueia Pessoa fora do escopo da liderança", () => {
    expect(routerSource).toContain(
      compactSource("async function resolveReferralSource")
    );
    expect(routerSource).toContain(
      compactSource('sourceType: "celula" as const')
    );
    expect(routerSource).toContain(
      compactSource('sourceType: "ministerio" as const')
    );
    expect(routerSource).toContain(
      compactSource('sourceType: "departamento" as const')
    );
    expect(routerSource).toContain(
      compactSource(
        "Você só pode indicar Pessoas vinculadas à sua Célula, Ministério ou Departamento."
      )
    );
    expect(dbSource).toContain(
      compactSource("Esta Pessoa já possui um caso ativo na Consolidação.")
    );
  });

  it("permite aprovação pastoral opcional e aceite direto por Consolidadora oficial", () => {
    expect(routerSource).toContain(
      compactSource("if (!context.capabilities.canManageConsolidation)")
    );
    expect(routerSource).toContain(
      compactSource("approvedByPersonId: context.actor.personId ?? null")
    );
    expect(routerSource).not.toContain(
      compactSource(
        "if (!context.capabilities.canManageConsolidation || !context.actor.personId)"
      )
    );
    expect(routerSource).toContain(
      compactSource('["pendente", "aprovado"].includes(referral.status)')
    );
    expect(routerSource).toContain(
      compactSource(
        "(!referral.assignedToPersonId || referral.assignedToPersonId === actor.personId)"
      )
    );
    expect(consolidationSource).toContain(
      compactSource(
        "Um Consolidador oficialmente atribuído pode assumir diretamente"
      )
    );
    expect(consolidationSource).not.toContain(
      compactSource("Aprovação pastoral</span>")
    );
    expect(consolidationSource).toContain(
      compactSource("2. Assunção ou triagem")
    );
    expect(consolidationSource).not.toContain(
      compactSource("Aguardando aprovação pastoral")
    );
    expect(dbSource).toContain(
      compactSource("approvedByPersonId: number | null")
    );
  });

  it("expõe painéis responsivos, filtros e histórico sem criar modais aninhados", () => {
    expect(consolidationSource).toContain(compactSource("caseFilter"));
    expect(consolidationSource).toContain(compactSource("visitFilter"));
    expect(consolidationSource).toContain(
      compactSource("<ConsolidationAssignmentControl")
    );
    expect(consolidationSource).toContain(
      compactSource("<VisitAssignmentControl")
    );
    expect(assignmentSource).toContain(
      compactSource("trpc.consolidation.assignmentHistory.useQuery")
    );
    expect(visitAssignmentSource).toContain(compactSource("visitId: visit.id"));
    expect(consolidationSource).toContain(compactSource("Aceitar visita"));
    expect(ministryPanelSource).not.toContain(compactSource("Ministério ID"));
    expect(ministryPanelSource).not.toContain(compactSource("<Dialog"));
  });

  it("mantém os cards modernos minimalistas com uma ação principal e detalhes progressivos", () => {
    expect(consolidationSource).toContain(compactSource("expandedReferralId"));
    expect(consolidationSource).toContain(
      compactSource("getPrimaryReferralAction")
    );
    expect(consolidationSource).toContain(
      compactSource("const primaryAction =")
    );
    expect(consolidationSource).toContain(
      compactSource(
        'const canRecordFollowUp = referral.status === "aceito" || referral.status === "em_acompanhamento";'
      )
    );
    expect(consolidationSource).toContain(compactSource('return "details";'));
    expect(consolidationSource).toContain(
      compactSource("Registrar acompanhamento")
    );
    expect(consolidationSource).toContain(compactSource("Ver detalhes"));
    expect(consolidationSource).toContain(
      compactSource("Ações secundárias, histórico e próximos passos")
    );
    expect(consolidationSource).toContain(
      compactSource("id={`referral-details-${referral.id}`}")
    );
  });

  it("preserva o contexto vindo da ficha e oferece retorno direto para a Pessoa", () => {
    expect(consolidationSource).toContain(
      compactSource("const [location, navigate] = useLocation();")
    );
    expect(consolidationSource).toContain(
      compactSource(
        'const focusPersonId = Number(routeParams.get("personId"));'
      )
    );
    expect(consolidationSource).toContain(
      compactSource('const fromPeople = routeParams.get("from") === "pessoas"')
    );
    expect(consolidationSource).toContain(
      compactSource(
        "const focusedReferral = fromPeople ? allReferrals.find((referral) => referral.personId === focusPersonId)"
      )
    );
    expect(consolidationSource).toContain(
      compactSource(
        "const focusedLegacy = fromPeople ? (consolidations ?? []).find"
      )
    );
    expect(consolidationSource).toContain(
      compactSource("setExpandedReferralId(focusedReferral.id)")
    );
    expect(consolidationSource).toContain(
      compactSource("setLegacyHistoryOpen(true)")
    );
    expect(consolidationSource).toContain(
      compactSource("consolidation-referral-${focusedReferral.id}")
    );
    expect(consolidationSource).toContain(
      compactSource("legacy-consolidation-${focusedLegacy.id}")
    );
    expect(consolidationSource).toContain(compactSource("Voltar à ficha"));
    expect(consolidationSource).toContain(
      compactSource("O registro relacionado foi destacado")
    );
  });

  it("deixa claro quando a ação principal apenas abre a escolha de Célula", () => {
    expect(consolidationSource).toContain(compactSource("Escolher Célula"));
    expect(consolidationSource).toContain(
      compactSource("aria-expanded={isExpanded}")
    );
    expect(consolidationSource).toContain(
      compactSource("getReferralQueueEmptyMessage(caseFilter)")
    );
    expect(consolidationSource).toContain(
      compactSource("Não há casos aguardando responsável neste momento.")
    );
    expect(consolidationSource).toContain(
      compactSource("Não há casos com prazo vencido neste momento.")
    );
  });

  it("usa prioridade tipada no App do Líder e Visitas reais na Central de Cuidado", () => {
    expect(leaderSource).toContain(
      compactSource('priority: "normal" | "alta" | "urgente"')
    );
    expect(leaderSource).toContain(
      compactSource('priority: referralByCell[myCell.id].priority ?? "normal"')
    );
    expect(careSource).toContain(compactSource("visit.id"));
    expect(careSource).toContain(compactSource("visit.caseReason"));
    expect(routerSource).toContain(
      compactSource("getCareVisitsByChurch(input.churchId)")
    );
  });

  it("torna o encerramento e a integração em Célula decisões explícitas da jornada", () => {
    expect(routerSource).toContain(
      compactSource('if (referral.status !== "em_acompanhamento")')
    );
    expect(routerSource).toContain(
      compactSource(
        "getConsolidationFollowUpsByReferral(input.id, input.churchId)"
      )
    );
    expect(routerSource).toContain(compactSource("integrateReferralIntoCell"));
    expect(dbSource).toContain(
      compactSource(
        "export async function integrateConsolidationReferralIntoCell"
      )
    );
    expect(dbSource).toContain(compactSource('status: "encerrado"'));
    const integrationStart = dbSource.indexOf(
      "export async function integrateConsolidationReferralIntoCell"
    );
    const integrationEnd = dbSource.indexOf("// ─── EVENTS", integrationStart);
    const integrationBlock = dbSource.slice(integrationStart, integrationEnd);
    expect(integrationBlock).toContain(compactSource('status: "encerrado"'));
    expect(integrationBlock).not.toContain(
      compactSource("Cuidado transferido após integração")
    );
    expect(integrationBlock).not.toContain(
      compactSource("tx.insert(careAssignments)")
    );
    expect(consolidationSource).toContain(
      compactSource("Próximo destino da Pessoa")
    );
    expect(consolidationSource).toContain(compactSource("Concluir e integrar"));
    expect(consolidationSource).toContain(
      compactSource("Histórico legado de Consolidação")
    );
    expect(consolidationSource).toContain(
      compactSource("A fila moderna de cuidado está na seção acima")
    );
  });

  it("usa o histórico moderno para o primeiro acompanhamento e preserva o legado apenas como compatibilidade", () => {
    expect(routerSource).toContain(compactSource("recordModernFirstContact"));
    expect(dbSource).toContain(
      compactSource("export async function recordModernFirstContact")
    );
    expect(careSource).toContain(
      compactSource(
        "Primeiro acompanhamento registrado no histórico da Consolidação."
      )
    );
    expect(careSource).toContain(
      compactSource("Registrar primeiro acompanhamento")
    );
    expect(leaderSource).toContain(compactSource('href="/app/consolidacao"'));
  });

  it("fecha os estados finais com cancelamento e bloqueia finalização com visita aberta", () => {
    expect(routerSource).toContain(
      compactSource("getOpenCareVisitsByReferral")
    );
    expect(routerSource).toContain(compactSource("cancelReferral"));
    expect(routerSource).toContain(
      compactSource(
        "Conclua ou cancele as visitas abertas antes de encerrar este acompanhamento."
      )
    );
    expect(dbSource).toContain(
      compactSource(
        "Conclua ou cancele as visitas abertas antes de integrar esta Pessoa em uma Célula."
      )
    );
    expect(routerSource).toContain(
      compactSource(
        "Somente a Consolidadora responsável, o Pastor responsável ou a liderança gestora da Consolidação pode registrar este acompanhamento."
      )
    );
    expect(consolidationSource).toContain(compactSource('value="cancelados"'));
    expect(consolidationSource).toContain(compactSource("Cancelar caso"));
    expect(consolidationSource).toContain(compactSource("Checklist histórico"));
    expect(consolidationSource).toContain(
      compactSource("casos modernos de cuidado")
    );
    expect(consolidationSource).not.toContain(
      compactSource("toggleItem(c.id, item.key, checked)")
    );
  });
});
