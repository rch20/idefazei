import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schemaSource = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
const migrationSource = readFileSync(resolve(process.cwd(), "drizzle/0044_white_red_shift.sql"), "utf8");
const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const listPageSource = readFileSync(resolve(process.cwd(), "client/src/pages/EncontroComDeus.tsx"), "utf8");
const detailPageSource = readFileSync(resolve(process.cwd(), "client/src/pages/EncontroComDeusDetalhe.tsx"), "utf8");
const publicFormSource = readFileSync(resolve(process.cwd(), "client/src/pages/EncontroFichaPublica.tsx"), "utf8");
const layoutSource = readFileSync(resolve(process.cwd(), "client/src/components/ChurchLayout.tsx"), "utf8");
const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

describe("Arquitetura do Encontro com Deus", () => {
  it("separa encontro, ficha, equipes, servos, checklist e histórico por tenant", () => {
    expect(schemaSource).toContain('mysqlTable("encounter_disciple_forms"');
    expect(schemaSource).toContain('mysqlTable("encounter_public_forms"');
    expect(schemaSource).toContain('mysqlTable("encounter_teams"');
    expect(schemaSource).toContain('mysqlTable("encounter_servant_assignments"');
    expect(schemaSource).toContain('mysqlTable("encounter_checklist_items"');
    expect(schemaSource).toContain('mysqlTable("encounter_history"');
    expect(migrationSource).toContain('UNIQUE(`churchId`,`encounterEventId`,`personId`)');
    expect(migrationSource).toContain('UNIQUE(`churchId`,`encounterEnrollmentId`)');
    expect(migrationSource).toContain('UNIQUE(`publicToken`)');
  });

  it("mantém membro comum fora da gestão e libera somente responsáveis designados", () => {
    expect(routerSource).toContain("requireEncounterModuleAccess");
    expect(routerSource).toContain("getEncounterManagedEventIds");
    expect(routerSource).toContain("A gestão do Encontro com Deus é restrita à liderança e aos responsáveis designados.");
    expect(layoutSource).toContain("requiresEncounterAccess: true");
    expect(layoutSource).toContain("trpc.encontro.hasAccess.useQuery");
    expect(listPageSource).toContain("Participar como discípulo não libera acesso a esta área.");
  });

  it("protege todas as mutações sensíveis também pelo identificador do encontro", () => {
    expect(dbSource).toContain("eq(encounterDiscipleForms.encounterEventId, data.eventId)");
    expect(dbSource).toContain("eq(encounterServantAssignments.encounterEventId, eventId)");
    expect(dbSource).toContain("eq(encounterChecklistItems.encounterEventId, eventId)");
    expect(routerSource).toContain("requireEncounterEventAccess");
    expect(routerSource).toContain("resolved.church.id !== ctx.tenantChurchId");
    expect(routerSource).toContain("resolved.church.slug !== ctx.tenantSlug");
  });

  it("cria automaticamente a hierarquia e as equipes iniciais do encontro", () => {
    ["Supervisor Espiritual", "Coordenador", "Intercessores", "Stand-by", "Cozinha", "Limpeza", "Correios"].forEach((name) => expect(dbSource).toContain(name));
    expect(dbSource).toContain("DEFAULT_ENCOUNTER_TEAMS");
    expect(dbSource).toContain("parentTeamId: team.category === \"lideranca\" ? null : coordinatorTeamId");
  });

  it("permite função manual contextual sem alterar a função ministerial da Pessoa", () => {
    expect(schemaSource).toContain('roleSource: mysqlEnum("roleSource", ["catalogo", "manual"])');
    expect(detailPageSource).toContain("Adicionar função manual");
    expect(detailPageSource).toContain("Funções específicas deste encontro, sem alterar o cargo permanente da Pessoa.");
    expect(detailPageSource).toContain("roleSource: servantForm.roleMode");
    expect(detailPageSource).toContain("Funções avulsas");
  });

  it("oferece ficha pública sem login e envia direto para a listagem de discípulos", () => {
    expect(appSource).toContain('path="/encontro/ficha/:token"');
    expect(routerSource).toContain("publicForm: router({");
    expect(routerSource).toContain("submitEncounterDiscipleForm");
    expect(dbSource).toContain('source: "public_form"');
    expect(dbSource).toContain('action: "ficha_publica_recebida"');
    expect(dbSource).toContain("ENCOUNTER_FORM_ALREADY_SUBMITTED");
    expect(dbSource).not.toContain("onDuplicateKeyUpdate({ set: formValues })");
    expect(publicFormSource).toContain("Você não precisa criar senha nem fazer login.");
    expect(publicFormSource).toContain("Nome da mãe, pai ou responsável");
    expect(publicFormSource).toContain("Nome de um amigo");
    expect(publicFormSource).toContain("Quem convidou para o encontro");
  });

  it("mantém ciclo de vida, capacidade, duplicidade e trilha de auditoria no servidor", () => {
    expect(schemaSource).toContain('status: mysqlEnum("status", ["rascunho", "planejamento", "confirmado", "em_andamento", "encerrado", "cancelado"])');
    expect(dbSource).toContain("ENCOUNTER_DUPLICATE_ENROLLMENT");
    expect(dbSource).toContain("ENCOUNTER_CAPACITY_REACHED");
    expect(routerSource).toContain("addEncounterHistory");
    expect(detailPageSource).toContain("Histórico operacional");
    expect(detailPageSource).toContain("Configurações do encontro");
    expect(routerSource).toContain("Somente a administração pode alterar o responsável pelo encontro.");
  });
});
