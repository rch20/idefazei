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

  it("organiza os cards da Jornada com conteúdo e ações separados no desktop", () => {
    expect(pageSource).toContain("rounded-2xl border p-4 shadow-sm transition-[border-color,box-shadow,transform]");
    expect(pageSource).toContain("lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)]");
    expect(pageSource).toContain("Ações da etapa");
    expect(pageSource).toContain("hover:-translate-y-px hover:shadow-md");
  });

  it("exibe estados claros, progresso e ações não lineares para cada etapa", () => {
    expect(pageSource).toContain("trpc.people.journey.useQuery");
    expect(pageSource).toContain("trpc.people.updateJourneyStage.useMutation");
    expect(pageSource).toContain('status === "concluida"');
    expect(pageSource).toContain('status === "pendente"');
    expect(pageSource).toContain('Não registrada');
    expect(pageSource).toContain("JOURNEY_STATUS_CLASS");
    expect(pageSource).toContain("JOURNEY_STAGE_DESCRIPTIONS");
    expect(pageSource).toContain("journeyProgressPercent");
    expect(pageSource).toContain('role="progressbar"');
    expect(pageSource).toContain('isCurrent ? "border-gold/70');
    expect(pageSource).toContain("Etapa principal");
    expect(pageSource).toContain("Concluir etapa");
    expect(pageSource).toContain("A etapa principal é alterada em Acompanhamento da Jornada");
    expect(pageSource).not.toContain("Tornar atual");
    expect(pageSource).toContain("Observação desta atualização");
  });

  it("separa etapa principal de frentes atuais e limita a gestão ao pastor", () => {
    expect(pageSource).toContain("const parallelJourneyStages");
    expect(pageSource).toContain("Frentes atuais");
    expect(pageSource).toContain("Participações formativas que acontecem em paralelo à etapa principal.");
    expect(pageSource).toContain("isParallelCurrent");
    expect(pageSource).toContain("Tornar frente atual");
    expect(pageSource).toContain("Remover frente atual");
    expect(pageSource).toContain("{isPastor && !isCurrent");
    expect(routerSource).toContain("setParallelJourneyStage: protectedProcedure");
    expect(routerSource).toContain("requireParallelJourneyPermission");
    expect(routerSource).toContain("Somente o Pastor Presidente ou Pastor Local pode definir frentes paralelas");
    expect(dbSource).toContain("setParallelJourneyStage");
    expect(dbSource).toContain("discipleshipStageProgress.isCurrent");
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
    expect(pageSource).toContain("const selectedPersonIsPastor = pastoralCoverageQuery.data?.isPastor === true;");
    expect(pageSource).toContain("const canManagePastoralCoverage = Boolean(isPastorPresident && selectedPerson?.id && selectedPersonIsPastor);");
    expect(pageSource).toContain("trpc.people.savePastoralCoverage.useMutation");
    expect(pageSource).toContain("trpc.people.removePastoralCoverage.useMutation");
    expect(pageSource).toContain("Cobertura espiritual");
    expect(pageSource).toContain("Somente o Administrador Presidente pode cadastrar, alterar ou remover esta informação.");
    expect(pageSource).toContain("Configurações → Pessoas e acessos");
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
    expect(pageSource).toContain('const routeSection = routeParams.get("section");');
    expect(pageSource).toContain("function closePersonJourney()");
    expect(pageSource).toContain('params.delete("personId")');
    expect(pageSource).toContain('params.delete("section")');
  });

  it("busca a Pessoa pelo personId da URL e abre a ficha diretamente", () => {
    expect(pageSource).toContain("const search = typeof window !== \"undefined\" ? window.location.search");
    expect(pageSource).toContain("const routePersonId = Number(routeParams.get(\"personId\"));");
    expect(pageSource).toContain("trpc.people.getById.useQuery");
    expect(pageSource).toContain("const person = linkedPersonQuery.data ?? (people ?? []).find((candidate) => candidate.id === routePersonId);");
    expect(pageSource).toContain("const requestedPersonSection");
    expect(pageSource).toContain("openPersonJourney(person, requestedPersonSection);");
    expect(pageSource).toContain("<Dialog open={Boolean(selectedPerson)}");
  });

  it("consome o deep link uma única vez e não reabre a ficha após o fechamento", () => {
    expect(pageSource).toContain('import { useEffect, useMemo, useRef, useState } from "react";');
    expect(pageSource).toContain("const consumedPersonDeepLinkRef = useRef<string | null>(null);");
    expect(pageSource).toContain("const personDeepLinkKey = Number.isInteger(routePersonId) && routePersonId > 0");
    expect(pageSource).toContain("if (!personDeepLinkKey)");
    expect(pageSource).toContain("consumedPersonDeepLinkRef.current = null;");
    expect(pageSource).toContain("if (consumedPersonDeepLinkRef.current === personDeepLinkKey) return;");
    expect(pageSource).toContain("consumedPersonDeepLinkRef.current = personDeepLinkKey;");
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

  it("prioriza cuidado no resumo e retira dados técnicos de acesso", () => {
    expect(pageSource).toContain('>Próximo passo</p>');
    expect(pageSource).toContain('>Acompanhado por</p>');
    expect(pageSource).not.toContain('>Responsabilidade</p>');
    expect(pageSource).not.toContain('>Acesso</p>');
    expect(pageSource).toContain('Nenhum próximo passo definido');
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
    expect(pageSource).toContain("currentCivilDateParts");
    expect(pageSource).toContain("civilDateParts(person.birthDate)");
    expect(routerSource).toContain("birthdays: protectedProcedure");
    expect(routerSource).toContain("await requireChurchAdministrator(ctx.user.id, input.churchId);");
    expect(dbSource).toContain("getBirthdaysByChurch(churchId: number, month: number, day?: number)");
    expect(dbSource).toContain("eq(people.churchId, churchId)");
    expect(dbSource).toContain("isNotNull(people.birthDate)");
    expect(dbSource).toContain("DATE_FORMAT(${people.birthDate}, '%Y-%m-%d')");
    expect(dbSource).toContain("const peopleColumns = getTableColumns(people)");
  });

  it("exige nascimento no cadastro completo e mantém indicação simples para membros", () => {
    expect(pageSource).toContain('<Label>Data de Nascimento *</Label>');
    expect(routerSource).toContain("birthDate: birthDateInput,");
    expect(routerSource).toContain("birthDate: birthDateInput.optional(),");
    expect(routerSource).toContain("if (!isSelfIndication && !input.birthDate)");
  });

  it("exige WhatsApp no cadastro manual de Pessoa e valida no servidor", () => {
    expect(pageSource).toContain("<Label>WhatsApp *</Label>");
    expect(pageSource).toContain("required minLength={10}");
    expect(routerSource).toContain("const whatsappInput");
    expect(routerSource).toContain("whatsapp: whatsappInput,");
    expect(routerSource).toContain("Informe um WhatsApp válido com DDD.");
  });

  it("organiza a lista em um diretório operacional com filtros acionáveis", () => {
    expect(pageSource).toContain("trpc.people.directory.useQuery");
    expect(pageSource).toContain('aria-label="Resumo operacional de Pessoas"');
    expect(pageSource).toContain('type DirectoryFilter =');
    expect(pageSource).toContain('"sem_responsavel"');
    expect(pageSource).toContain('"atencao"');
    expect(pageSource).toContain("aria-pressed={directoryFilter === filter}");
    expect(pageSource).toContain('aria-label="Filtros de Jornada"');
    expect(pageSource).toContain("DIRECTORY_CARE_LABELS[care.status]");
  });

  it("mantém o diretório limitado ao tenant e ao escopo server-side", () => {
    expect(routerSource).toContain("directory: protectedProcedure");
    expect(routerSource).toContain("getAccessiblePersonIds(ctx.user.id, input.churchId)");
    expect(routerSource).toContain("getPeopleDirectoryByChurch(input.churchId, input.search");
    expect(dbSource).toContain("export async function getPeopleDirectoryByChurch");
    expect(dbSource).toContain("eq(people.churchId, churchId)");
    expect(dbSource).toContain("eq(careAssignments.churchId, churchId)");
    expect(dbSource).toContain("eq(consolidationReferrals.churchId, churchId)");
    expect(dbSource).toContain("eq(cells.churchId, churchId)");
    expect(dbSource).toContain('"Acompanhamento em dia"');
  });

  it("não transforma a lista de Pessoas em uma segunda Consolidação", () => {
    expect(pageSource).toContain("Uma Pessoa, várias participações e um histórico único de cuidado.");
    expect(pageSource).toContain("Abrir Consolidação");
    expect(pageSource).not.toContain("createReferral.mutate({ churchId, personId: person.id");
  });
});
