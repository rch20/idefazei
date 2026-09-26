import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolvePersonSection } from "../lib/personSection";
import { resolvePersonSectionState } from "../components/PersonSectionState";

const root = resolve(__dirname, "../../..");
const pageSource = readFileSync(resolve(root, "client/src/pages/Pessoas.tsx"), "utf8");
const destructiveDialogSource = readFileSync(resolve(root, "client/src/components/ConfirmDestructiveActionDialog.tsx"), "utf8");
const summarySource = readFileSync(resolve(root, "client/src/components/PersonExecutiveSummary.tsx"), "utf8");
const historySource = readFileSync(resolve(root, "client/src/components/PersonHistoryTimeline.tsx"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const leaderSource = readFileSync(resolve(root, "client/src/pages/AppLider.tsx"), "utf8");
const centralCareSource = readFileSync(resolve(root, "client/src/pages/CentralCuidado.tsx"), "utf8");
const dashboardSource = readFileSync(resolve(root, "client/src/pages/Dashboard.tsx"), "utf8");

describe("Ficha da Pessoa — jornada e escopo", () => {
  it("resolve deep links pastorais sem substituir a autorização server-side", () => {
    expect(resolvePersonSection("cobertura", { canManagePastoralCoverage: true, accessPending: false })).toBe("cobertura");
    expect(resolvePersonSection("cobertura", { canManagePastoralCoverage: false, accessPending: false })).toBe("resumo");
    expect(resolvePersonSection("cobertura", { canManagePastoralCoverage: false, accessPending: true })).toBeNull();
    expect(resolvePersonSection("jornada", { canManagePastoralCoverage: false, accessPending: true })).toBe("jornada");
  });

  it("deriva estados de leitura sem confundir erro, vazio e indisponibilidade", () => {
    expect(resolvePersonSectionState({ isLoading: true })).toBe("loading");
    expect(resolvePersonSectionState({ isError: true })).toBe("error");
    expect(resolvePersonSectionState({ enabled: false })).toBe("unavailable");
    expect(resolvePersonSectionState({ hasData: true, isEmpty: true })).toBe("empty");
    expect(resolvePersonSectionState({ hasData: true, isFetching: true })).toBe("refreshing");
    expect(resolvePersonSectionState({ hasData: true })).toBe("ready");
  });

  it("separa a ficha em resumo, jornada, participações, cuidado e histórico", () => {
    expect(pageSource).toContain('aria-label="Seções da ficha da Pessoa"');
    expect(pageSource).toContain('{ value: "resumo", label: "Resumo"');
    expect(pageSource).toContain('{ value: "jornada", label: "Jornada"');
    expect(pageSource).toContain('{ value: "participacoes", label: "Participações"');
    expect(pageSource).toContain('{ value: "cuidado", label: "Cuidado"');
    expect(pageSource).toContain('{ value: "cobertura", label: "Cobertura espiritual"');
    expect(pageSource).toContain('{ value: "historico", label: "Histórico"');
    expect(pageSource).toContain('effectivePersonSection === "resumo"');
    expect(pageSource).toContain('effectivePersonSection === "jornada"');
    expect(pageSource).toContain('effectivePersonSection === "cuidado"');
    expect(pageSource).toContain('effectivePersonSection === "cobertura"');
    expect(pageSource).toContain('effectivePersonSection === "historico"');
  });

  it("mantém uma navegação única com apresentação compacta no mobile", () => {
    expect(pageSource).toContain("const PERSON_SECTION_OPTIONS");
    expect(pageSource).toContain('import { PERSON_SECTION_VALUES, resolvePersonSection, type PersonSection } from "@/lib/personSection";');
    expect(pageSource).toContain('aria-label="Navegação da ficha no celular"');
    expect(pageSource).toContain('id="person-section-mobile"');
    expect(pageSource).toContain('onValueChange={(value) => selectPersonSection(value as PersonSection)}');
    expect(pageSource).toContain('className={`hidden gap-1 rounded-xl bg-muted p-1 sm:grid');
    expect(pageSource).toContain('id="person-section-content"');
    expect(pageSource).toContain('aria-controls="person-section-content"');
    expect(pageSource).toContain('!option.pastoralOnly || canManagePastoralCoverage');
    expect(pageSource).toContain("const nextLocation = getPersonHref(selectedPerson.id, section);");
  });

  it("normaliza a seção pastoral e preserva o contexto da Pessoa", () => {
    expect(pageSource).toContain("const pastoralCoverageAccessPending = effectiveRolesQuery.isLoading || pastoralCoverageQuery.isLoading;");
    expect(pageSource).toContain("const resolvedRequestedSection = resolvePersonSection(requestedPersonSection");
    expect(pageSource).toContain('const effectivePersonSection = resolvedRequestedSection ?? "resumo";');
    expect(pageSource).toContain('if (requestedPersonSection !== "cobertura" || !selectedPerson?.id || resolvedRequestedSection !== "resumo") return;');
    expect(pageSource).toContain('navigate(nextLocation, { replace: true });');
    expect(pageSource).toContain("effectivePersonSection === \"resumo\"");
    expect(pageSource).toContain("effectivePersonSection === \"cobertura\" && canManagePastoralCoverage");
    expect(pageSource).toContain("returnSection=${effectivePersonSection}");
    expect(routerSource).toContain("async function requirePastorPresident");
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
    expect(pageSource).toContain("openPersonJourney(person, requestedPersonSection, requestedCareFocus);");
    expect(pageSource).toContain("<Dialog open={Boolean(selectedPerson)}");
  });

  it("trata a ficha como destino central e sincroniza abertura e seção com a URL", () => {
    expect(pageSource).toContain("const PERSON_SECTIONS =");
    expect(pageSource).toContain("function getPersonHref(personId: number, section: PersonSection)");
    expect(pageSource).toContain("function selectPersonSection(section: PersonSection)");
    expect(pageSource).toContain("const nextLocation = getPersonHref(person.id, section);");
    expect(pageSource).toContain("if (location !== nextLocation) navigate(nextLocation);");
    expect(pageSource).toContain("aria-label={`Abrir ficha de ${person.fullName}`}");
    expect(pageSource).toContain("<span className=\"hidden shrink-0 text-xs font-semibold text-navy sm:inline\">Abrir ficha</span>");
    expect(pageSource).toContain("sm:max-w-4xl lg:max-w-5xl");
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

  it("abre o foco do Radar para definir o discipulador sem misturar Consolidação ou Célula", () => {
    expect(pageSource).toContain('const requestedCareFocus: PersonCareFocus = routeParams.get("focus") === "discipulador" ? "discipulador" : null;');
    expect(pageSource).toContain('careFocus === "discipulador" ? "discipulador" : "consolidador"');
    expect(pageSource).toContain("Discipulador principal");
    expect(pageSource).toContain("A Consolidação e a Célula permanecem independentes.");
    expect(pageSource).toContain("Somente Pastores ou Supervisores podem definir o discipulador principal.");
    expect(routerSource).toContain("setPrimaryDiscipler: protectedProcedure");
  });

  it("não expõe ações pastorais ministeriais para perfis não pastorais", () => {
    expect(pageSource).toContain("const canManageMinistryFunctions = isPastor;");
    expect(pageSource).toContain('effectivePersonSection === "participacoes" && canManageMinistryFunctions');
    expect(pageSource).toContain('effectivePersonSection === "cuidado" && (isPrimaryDisciplerFocus ? canManagePrimaryDiscipler : canManageJourney)');
  });

  it("mantém participação em Célula como consulta ou ação contextual", () => {
    expect(pageSource).toContain("Participação em Célula");
    expect(pageSource).toContain("const canManageCellParticipation");
    expect(pageSource).toContain("A integração e a transferência de Célula são feitas pelo Pastor ou pela liderança responsável.");
    expect(pageSource).toContain("trpc.cells.personParticipation.useQuery");
    expect(pageSource).toContain('status === "integrada"');
    expect(pageSource).toContain("Célula atual: Sem Célula");
    expect(pageSource).toContain("Sair da Célula");
    expect(pageSource).toContain("A Jornada principal foi preservada");
    expect(routerSource).toContain("personParticipation: protectedProcedure");
    expect(routerSource).toContain("removePerson: protectedProcedure");
    expect(dbSource).toContain("export async function removePersonFromCell");
    expect(dbSource).toContain("leftAt: now");
    expect(routerSource).not.toContain('updatePerson(person.id, input.churchId, { discipleshipStage: "celula" });');
  });

  it("confirma remoções destrutivas sem alterar a Jornada ou apagar históricos", () => {
    expect(pageSource).toContain("type PendingDestructiveAction");
    expect(pageSource).toContain("setPendingDestructiveAction");
    expect(pageSource).toContain('title={pendingDestructiveAction?.kind === "pastoral-coverage-removal" ? "Remover cobertura espiritual?" : "Retirar da Célula?"}');
    expect(pageSource).toContain('cancelLabel={pendingDestructiveAction?.kind === "pastoral-coverage-removal" ? "Manter cobertura" : "Manter na Célula"}');
    expect(pageSource).toContain('confirmLabel={pendingDestructiveAction?.kind === "pastoral-coverage-removal" ? "Remover cobertura" : "Retirar da Célula"}');
    expect(pageSource).toContain("O histórico da participação será preservado e a Jornada principal não será alterada.");
    expect(pageSource).toContain("O histórico da cobertura será preservado.");
    expect(pageSource).toContain("onConfirm={confirmPendingDestructiveAction}");
    expect(pageSource).toContain("setPendingDestructiveAction(null)");
    expect(pageSource).not.toContain("window.confirm");
    expect(destructiveDialogSource).toContain("event.preventDefault()");
    expect(destructiveDialogSource).toContain("disabled={pending}");
  });

  it("mantém atuações ministeriais como consulta e direciona a edição para o Ministério", () => {
    expect(pageSource).toContain("Atuações na equipe");
    expect(pageSource).toContain("Para adicionar ou alterar uma atuação, abra o painel do Ministério correspondente.");
    expect(pageSource).not.toContain("Adicionar atuação na equipe");
    expect(pageSource).not.toContain("saveMinistryFunction");
  });

  it("prioriza cuidado no resumo e retira dados técnicos de acesso", () => {
    expect(summarySource).toContain('>Próximo passo</p>');
    expect(summarySource).toContain('>Acompanhado por</p>');
    expect(summarySource).not.toContain('>Responsabilidade</p>');
    expect(summarySource).not.toContain('>Acesso</p>');
    expect(summarySource).toContain('Acompanhamento em dia');
    expect(summarySource).toContain('attentionState?: PersonSectionStateKind | "ready"');
    expect(summarySource).toContain("onAttentionRetry");
    expect(summarySource).toContain("isBlockingAttentionState");
  });

  it("não apresenta valores finais durante loading ou erro das consultas da ficha", () => {
    expect(pageSource).toContain("const attentionState = effectiveRolesQuery.isLoading");
    expect(pageSource).toContain("const cellParticipationState = resolvePersonSectionState");
    expect(pageSource).toContain("const currentCareState = resolvePersonSectionState");
    expect(pageSource).toContain("const personMembershipsState = resolvePersonSectionState");
    expect(pageSource).toContain("const pastoralCoverageState = resolvePersonSectionState");
    expect(pageSource).toContain('title="Não foi possível carregar a participação em Célula"');
    expect(pageSource).toContain('title="Nenhum responsável definido"');
    expect(pageSource).toContain("Atualização parcial do histórico");
    expect(pageSource).not.toContain('currentCare.isLoading ? <p className="mt-2 text-sm text-muted-foreground">Carregando…</p>');
  });

  it("usa um resumo executivo único para Jornada, Célula e cuidado", () => {
    expect(pageSource).toContain('import { PersonExecutiveSummary } from "@/components/PersonExecutiveSummary";');
    expect(pageSource).toContain("<PersonExecutiveSummary");
    expect(pageSource).toContain('stageLabel={STAGES_LABELS[selectedPerson.discipleshipStage ?? "nova_alma"]}');
    expect(pageSource).toContain("currentCellName={currentCell?.cellName}");
    expect(pageSource).toContain("hasCellHistory={Boolean(cellParticipationQuery.data?.hasHistory)}");
    expect(pageSource).not.toContain("participationCount");
    expect(summarySource).toContain('aria-label="Resumo executivo da ficha da Pessoa"');
    expect(summarySource).toContain('aria-label="Próximo passo da Pessoa"');
    expect(summarySource).toContain("Célula atual");
    expect(summarySource).toContain("Pendente significa apenas");
    expect(summarySource).not.toContain("Acessos efetivos");
  });

  it("mostra um próximo passo único e leva cada pendência ao contexto correto", () => {
    expect(pageSource).toContain("const nextStepLabel");
    expect(pageSource).toContain('"Abrir Consolidação"');
    expect(pageSource).toContain('"Abrir Participações"');
    expect(pageSource).toContain('"Abrir Cuidado"');
    expect(pageSource).toContain('navigate(`/app/consolidacao?personId=${selectedPerson.id}&from=pessoas&returnSection=${effectivePersonSection}`)');
    expect(pageSource).toContain("Abrindo o caso de Consolidação desta Pessoa.");
    expect(pageSource).toContain('toast.info("Abrindo Participações para integrar a Pessoa em uma Célula.")');
    expect(pageSource).toContain('toast.info("Abrindo Cuidado para atualizar o próximo passo.")');
    expect(pageSource).toContain('selectPersonSection("participacoes")');
    expect(pageSource).toContain('selectPersonSection("cuidado")');
  });

  it("organiza o histórico em uma linha do tempo única e categorizada", () => {
    expect(pageSource).toContain('import { PersonHistoryTimeline, type PersonHistoryEvent } from "@/components/PersonHistoryTimeline";');
    expect(pageSource).toContain("const historyTimeline: PersonHistoryEvent[]");
    expect(pageSource).toContain('category: "jornada" as const');
    expect(pageSource).toContain('category: "cuidado" as const');
    expect(pageSource).toContain('category: "consolidacao" as const');
    expect(pageSource).toContain('category: "celula" as const');
    expect(pageSource).toContain('source: "anterior" as const');
    expect(pageSource).toContain(".map((item, index) => ({ ...item, isLatest: index === 0 }))");
    expect(pageSource).toContain("hasModernConsolidationHistory");
    expect(pageSource).toContain("modernConsolidationTimeline");
    expect(pageSource).toContain('<PersonHistoryTimeline events={historyTimeline} />');
    expect(pageSource).toContain("Entrada na Célula");
    expect(pageSource).toContain("Saída da Célula");
    expect(historySource).toContain('export type PersonHistoryCategory = "jornada" | "cuidado" | "consolidacao" | "celula";');
    expect(historySource).toContain('export type PersonHistorySource = "moderno" | "anterior" | "jornada";');
    expect(historySource).toContain("Última atividade");
    expect(historySource).toContain("Registro anterior");
    expect(historySource).toContain("Mostrar mais histórico");
    expect(historySource).toContain("Mostrar menos histórico");
    expect(historySource).toContain("Ainda não há atividades históricas registradas");
    expect(historySource).not.toContain("trpc.");
    expect(historySource).not.toContain("navigate(");
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
