import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../../..");
const pageSource = readFileSync(resolve(root, "client/src/pages/Pessoas.tsx"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const leaderSource = readFileSync(resolve(root, "client/src/pages/AppLider.tsx"), "utf8");
const centralCareSource = readFileSync(resolve(root, "client/src/pages/CentralCuidado.tsx"), "utf8");
const dashboardSource = readFileSync(resolve(root, "client/src/pages/Dashboard.tsx"), "utf8");

describe("Ficha da Pessoa — jornada e escopo", () => {
  it("separa a ficha em resumo, jornada, participações, cuidado e histórico", () => {
    expect(pageSource).toContain('aria-label="Seções da ficha da Pessoa"');
    expect(pageSource).toContain('["resumo", "Resumo"]');
    expect(pageSource).toContain('["jornada", "Jornada"]');
    expect(pageSource).toContain('["participacoes", "Participações"]');
    expect(pageSource).toContain('["cuidado", "Cuidado"]');
    expect(pageSource).toContain('["cobertura", "Cobertura espiritual"]');
    expect(pageSource).toContain('["historico", "Histórico"]');
    expect(pageSource).toContain('personSection === "resumo"');
    expect(pageSource).toContain('personSection === "jornada"');
    expect(pageSource).toContain('personSection === "cuidado"');
    expect(pageSource).toContain('personSection === "cobertura"');
    expect(pageSource).toContain('personSection === "historico"');
  });

  it("exibe estados claros e ações não lineares para cada etapa", () => {
    expect(pageSource).toContain("trpc.people.journey.useQuery");
    expect(pageSource).toContain("trpc.people.updateJourneyStage.useMutation");
    expect(pageSource).toContain('status === "concluida"');
    expect(pageSource).toContain('status === "pendente"');
    expect(pageSource).toContain('Não registrada');
    expect(pageSource).toContain("Concluir etapa");
    expect(pageSource).toContain("Tornar atual");
    expect(pageSource).toContain("Observação desta atualização");
  });

  it("preserva eventos auditáveis e mantém a proteção server-side", () => {
    expect(routerSource).toContain("getDiscipleshipStageEvents");
    expect(routerSource).toContain("updateJourneyStage: protectedProcedure");
    expect(dbSource).toContain("discipleshipStageEvents");
    expect(dbSource).toContain("db.transaction(async (tx)");
    expect(dbSource).toContain("changedByChurchUserId");
  });

  it("mostra a cobertura espiritual somente na ficha pastoral do presidente", () => {
    expect(pageSource).toContain("const isPastorPresident = effectiveRoles.includes(\"pastor_presidente\");");
    expect(pageSource).toContain("trpc.people.pastoralCoverage.useQuery");
    expect(pageSource).toContain("const selectedPersonIsPastor = (pastoralCoverageCandidatesQuery.data ?? []).some");
    expect(pageSource).toContain("trpc.people.savePastoralCoverage.useMutation");
    expect(pageSource).toContain("trpc.people.removePastoralCoverage.useMutation");
    expect(pageSource).toContain("Cobertura espiritual");
    expect(pageSource).toContain("Somente o Administrador Presidente pode cadastrar, alterar ou remover esta informação.");
    expect(routerSource).toContain("async function requirePastorPresident");
    expect(routerSource).toContain("pastoralCoverage: protectedProcedure");
    expect(routerSource).toContain("savePastoralCoverage: protectedProcedure");
    expect(routerSource).toContain("removePastoralCoverage: protectedProcedure");
    expect(dbSource).toContain("pastoralCoverages");
    expect(dbSource).toContain("pastoralCoverageEvents");
  });

  it("abre a ficha na Jornada pelo App do Líder e limpa a URL ao fechar", () => {
    expect(leaderSource).toContain("section=jornada");
    expect(leaderSource).toContain(">\n                          Ficha\n");
    expect(pageSource).toContain('params.get("section")');
    expect(pageSource).toContain("function closePersonJourney()");
    expect(pageSource).toContain('params.delete("personId")');
    expect(pageSource).toContain('params.delete("section")');
  });

  it("abre diretamente a Pessoa selecionada a partir das filas de cuidado", () => {
    expect(centralCareSource).toContain("navigate(`/app/pessoas?personId=${personId}&section=cuidado`)");
    expect(centralCareSource).toContain("aria-label={`Abrir ficha de ${item.person.fullName}`}");
    expect(centralCareSource).toContain("<Users className=\"h-4 w-4\" /> Abrir lista geral");
    expect(dashboardSource).toContain("href={`/app/pessoas?personId=${item.person.id}&section=cuidado`}");
    expect(dashboardSource).not.toContain('href="/app/pessoas" className="w-fit rounded-lg border border-navy/20');
  });

  it("não expõe ações pastorais ministeriais para perfis não pastorais", () => {
    expect(pageSource).toContain("const canManageMinistryFunctions = isPastor;");
    expect(pageSource).toContain('personSection === "participacoes" && canManageMinistryFunctions');
    expect(pageSource).toContain('personSection === "cuidado" && canManageJourney');
  });

  it("mantém participação em Célula como consulta ou ação contextual", () => {
    expect(pageSource).toContain("Participação em Célula");
    expect(pageSource).toContain("const canManageCellParticipation");
    expect(pageSource).toContain("A integração e a transferência de Célula são feitas pelo Pastor ou pela liderança responsável.");
  });

  it("mantém atuações ministeriais como consulta e direciona a edição para o Ministério", () => {
    expect(pageSource).toContain("Atuações na equipe");
    expect(pageSource).toContain("Para adicionar ou alterar uma atuação, abra o painel do Ministério correspondente.");
    expect(pageSource).not.toContain("Adicionar atuação na equipe");
    expect(pageSource).not.toContain("saveMinistryFunction");
  });

  it("mostra um próximo passo único e leva cada pendência ao contexto correto", () => {
    expect(pageSource).toContain("const nextStepLabel");
    expect(pageSource).toContain('"Abrir Consolidação"');
    expect(pageSource).toContain('"Abrir Participações"');
    expect(pageSource).toContain('"Abrir Cuidado"');
    expect(pageSource).toContain('navigate("/app/consolidacao")');
    expect(pageSource).toContain('setPersonSection("participacoes")');
    expect(pageSource).toContain('setPersonSection("cuidado")');
  });

  it("protege a leitura de cuidado pelo escopo acessível da Pessoa", () => {
    expect(routerSource).toContain("await requireScopedPersonRead(ctx.user.id, input.churchId, input.personId);");
    expect(dbSource).toContain("coLeaderId: cells.coLeaderId");
  });

  it("oferece a lista de aniversariantes no mesmo contexto multi-tenant de Pessoas", () => {
    expect(pageSource).toContain("Aniversariantes");
    expect(pageSource).toContain("Hoje");
    expect(pageSource).toContain("Este mês");
    expect(pageSource).toContain("Mês dos aniversariantes");
    expect(pageSource).toContain("trpc.people.birthdays.useQuery");
    expect(pageSource).toContain("Pessoas sem data de nascimento não aparecem nesta lista.");
    expect(routerSource).toContain("birthdays: protectedProcedure");
    expect(routerSource).toContain("await requireChurchAdministrator(ctx.user.id, input.churchId);");
    expect(dbSource).toContain("getBirthdaysByChurch(churchId: number, month: number, day?: number)");
    expect(dbSource).toContain("eq(people.churchId, churchId)");
    expect(dbSource).toContain("isNotNull(people.birthDate)");
    expect(dbSource).toContain("DATE_FORMAT(${people.birthDate}, '%Y-%m-%d')");
  });

  it("exige nascimento no cadastro completo e mantém indicação simples para membros", () => {
    expect(pageSource).toContain('<Label>Data de Nascimento *</Label>');
    expect(routerSource).toContain("birthDate: birthDateInput,");
    expect(routerSource).toContain("birthDate: birthDateInput.optional(),");
    expect(routerSource).toContain("if (!isSelfIndication && !input.birthDate)");
  });
});
