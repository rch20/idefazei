import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const routerSourceNormalized = routerSource.replace(/\s+/g, " ");
const pageSource = readFileSync(
  resolve(root, "client/src/pages/Tesouraria.tsx"),
  "utf8"
);
const sectionSource = readFileSync(
  resolve(root, "client/src/components/TreasuryServiceSection.tsx"),
  "utf8"
);
const entrySheetSource = readFileSync(
  resolve(root, "client/src/components/TreasuryEntrySheetSection.tsx"),
  "utf8"
);
const hostSource = readFileSync(
  resolve(root, "client/src/components/TreasuryQuickActionHost.tsx"),
  "utf8"
);
const treasurySource = readFileSync(
  resolve(root, "client/src/lib/treasury.ts"),
  "utf8"
);

describe("Fluxo estrutural de prestação por culto", () => {
  it("mantém entidades de culto, contagem, depósito e relatório no schema", () => {
    expect(schemaSource).toContain(
      "export const treasuryServices = mysqlTable"
    );
    expect(schemaSource).toContain(
      "export const treasuryCountSheets = mysqlTable"
    );
    expect(schemaSource).toContain(
      "export const treasuryDeposits = mysqlTable"
    );
    expect(schemaSource).toContain("export const treasuryReports = mysqlTable");
    expect(schemaSource).toContain('serviceId: int("serviceId")');
    expect(schemaSource).toContain('countSheetId: int("countSheetId")');
  });

  it("preserva isolamento por igreja e dupla conferência", () => {
    expect(dbSource).toContain("eq(treasuryServices.churchId, churchId)");
    expect(dbSource).toContain("counterOnePersonId");
    expect(dbSource).toContain("counterTwoPersonId");
    expect(routerSource).toContain(
      "Os dois contadores precisam pertencer a esta igreja."
    );
    expect(routerSource).toContain(
      "A contagem precisa de duas pessoas diferentes."
    );
  });

  it("fecha a folha antes de emitir um snapshot histórico", () => {
    expect(dbSource).toContain('countSheet.status !== "fechada"');
    expect(dbSource).toContain("snapshot");
    expect(routerSource).toContain(
      "Feche a folha de contagem e confira o vínculo com o culto antes de emitir o relatório."
    );
    expect(sectionSource).toContain("Emitir relatório");
  });

  it("oferece nome do culto, vínculo opcional do lançamento e impressão", () => {
    expect(sectionSource).toContain("Nome do culto");
    expect(pageSource).toContain("serviceId");
    expect(pageSource).toContain("countSheetId");
    expect(sectionSource).toContain("Imprimir / salvar PDF");
    expect(sectionSource).toContain("Histórico de prestações anteriores");
  });

  it("centraliza a ficha do culto sem duplicar o livro-caixa", () => {
    expect(hostSource).toContain("TreasuryServiceContext");
    expect(hostSource).toContain("onRequestEntry");
    expect(sectionSource).toContain("Preencher ficha financeira");
    expect(pageSource).toContain("TreasuryEntrySheetSection");
    expect(pageSource).toContain("openEntrySheet");
    expect(routerSource).toContain("saveEntrySheet: protectedProcedure");
    expect(entrySheetSource).toContain(
      "Nenhum valor foi lançado no livro-caixa"
    );
    expect(sectionSource).toContain(
      "formatCivilDateKeyForInput(service.serviceDate)"
    );
    expect(schemaSource).toContain(
      'uniqueIndex("treasury_entry_sheets_church_service_unique")'
    );
    expect(dbSource).toContain("treasuryEntrySheetLines");
  });

  it("usa o botão Registrar entrada para iniciar a ficha financeira", () => {
    expect(pageSource).toContain('onClick={() => openEntrySheet()}');
    expect(pageSource).toContain("Abrir ficha financeira de entrada");
    expect(pageSource).toContain("dízimos, ofertas e outras contribuições");
    expect(pageSource).not.toContain(
      'onClick={() => openTransaction("entrada")}'
    );
  });

  it("reúne o culto em uma visão central e consulta apenas seus lançamentos vinculados", () => {
    expect(sectionSource).toContain("Visão central do culto");
    expect(sectionSource).toContain(
      "trpc.treasury.serviceTransactions.useQuery"
    );
    expect(sectionSource).toContain("Lançamentos vinculados");
    expect(sectionSource).toContain("Acesse apenas a etapa necessária");
    expect(sectionSource).toContain("onIssueReport");
    expect(sectionSource).toContain("onPrintReport");
    expect(sectionSource).toContain("onShareReport");
    expect(pageSource).toContain(
      "utils.treasury.serviceTransactions.invalidate()"
    );
    expect(schemaSource).not.toContain("treasuryCultServiceCenter");
  });

  it("mantém o histórico filtrável, compartilhável e com assinatura interna auditável", () => {
    expect(sectionSource).toContain("reportFrom");
    expect(sectionSource).toContain("reportTo");
    expect(sectionSource).toContain("reportSearch");
    expect(sectionSource).toContain("Limpar filtros");
    expect(sectionSource).toContain("Compartilhar relatório");
    expect(sectionSource).toContain("Assinatura interna auditável");
    expect(sectionSource).toContain("signReport.mutate");
    expect(routerSource).toContain("signReport: protectedProcedure");
    expect(dbSource).toContain("treasuryReportSignatures");
  });

  it("cria ocorrências recorrentes idempotentes e preserva exceções pontuais", () => {
    expect(schemaSource).toContain(
      "export const treasuryRecurringSchedules = mysqlTable"
    );
    expect(schemaSource).toContain(
      'recurringScheduleId: int("recurringScheduleId")'
    );
    expect(schemaSource).toContain(
      'occurrenceOverride: boolean("occurrenceOverride")'
    );
    expect(dbSource).toContain("materializeTreasuryRecurringOccurrences");
    expect(dbSource).toContain("treasuryRecurringSchedules.weekday");
    expect(routerSource).toContain("createRecurringSchedule");
    expect(routerSource).toContain("setRecurringScheduleActive");
    expect(sectionSource).toContain("Programação fixa");
    expect(sectionSource).toContain("Culto regular");
    expect(sectionSource).toContain("Não realizado");
  });

  it("mantém o histórico reimprimível e não cria uma segunda tesouraria", () => {
    expect(sectionSource).toContain("reportsQuery");
    expect(sectionSource).toContain("printReport(report)");
    expect(hostSource).toContain("TreasuryServiceSection");
    expect(dbSource).toContain("getTreasuryReportsByChurch");
  });

  it("retira o acesso duplicado sem apagar os campos exclusivos da prestação antiga", () => {
    expect(pageSource).not.toContain('action: "prestacao-hoje"');
    expect(pageSource).toContain(
      'actions: ["programacao", "relatorios-culto"]'
    );
    expect(hostSource).not.toContain('"prestacao-hoje"');
    expect(hostSource).toContain("const effectiveAction = action;");
    expect(sectionSource).toContain("Folha de contagem");
    expect(sectionSource).toContain("Registrar depósito");
    expect(sectionSource).toContain("Assinatura interna auditável");
    expect(dbSource).toContain("getTreasuryCountSheetsByChurch");
    expect(dbSource).toContain("getTreasuryDepositsByChurch");
    expect(dbSource).toContain("getTreasuryReportsByChurch");
  });

  it("refina Registrar entrada com resumo e CTA contextual", () => {
    expect(pageSource).toContain("Resumo do lançamento");
    expect(pageSource).toContain("Valor informado");
    expect(pageSource).toContain(
      '<AdaptiveFormDialogContent className="sm:max-w-4xl">'
    );
    expect(pageSource).toContain("Salvar entrada");
    expect(pageSource).toContain("Salvar saída");
  });

  it("aceita horários válidos no padrão HH:mm", () => {
    expect(routerSourceNormalized).toContain(
      "startTime: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/"
    );
    expect(sectionSource).toContain('type="time"');
  });

  it("não mantém o alias legado nem renderiza a prestação duplicada", () => {
    expect(hostSource).not.toContain('"prestacao-hoje"');
    expect(hostSource).toContain("const effectiveAction = action;");
    expect(sectionSource).not.toContain("Prestação de hoje");
    expect(sectionSource).not.toContain("Selecionar culto/evento");
    expect(sectionSource).not.toContain("Iniciar prestação de hoje");
  });

  it("preserva a data de calendário e compacta ações no mobile", () => {
    expect(treasurySource).toContain("civilDateParts");
    expect(treasurySource).toContain("currentCivilDateKey");
    expect(sectionSource).toContain("todayCivilDate");
    expect(sectionSource).toContain("Detalhes");
    expect(sectionSource).toContain("DropdownMenuContent");
    expect(sectionSource).toContain("Ver detalhes da prestação");
  });

  it("prioriza ocorrências de cultos e mantém o histórico em visão secundária", () => {
    expect(pageSource).toContain(
      'className="grid grid-cols-2 items-start gap-2.5 sm:gap-3 xl:grid-cols-4"'
    );
    expect(pageSource).toContain('label="Saldo atual"');
    expect(sectionSource).toContain("Ocorrências de cultos");
    expect(sectionSource).toContain("Cadastrar culto ou evento manual");
    expect(sectionSource).toContain("Registrar entrada do culto");
    expect(sectionSource).toContain("Registrar depósito");
    expect(sectionSource).toContain("Histórico de prestações anteriores");
    expect(sectionSource).toContain('const servicesToRender = services.slice(0, 12);');
    expect(sectionSource).not.toContain("Ver prestações recentes");
  });

  it("usa o Formulário Adaptativo nos cadastros operacionais extensos", () => {
    expect(sectionSource.match(/<AdaptiveFormDialogContent/g)).toHaveLength(4);
    expect(sectionSource).toContain("Nova programação fixa");
    expect(sectionSource).toContain("Editar programação fixa");
    expect(sectionSource).toContain("Cadastrar culto ou evento manual");
    expect(sectionSource).toContain("Folha de contagem");
    expect(sectionSource).toContain("Registrar depósito");
    expect(sectionSource).toContain("AdaptiveFormDialogFooter");
    expect(pageSource).toContain("Conciliação bancária");
    expect(pageSource).toContain("AdaptiveFormDialogFooter");
  });

  it("mantém confirmações, recibos e escolha de relatório fora do padrão de tela cheia", () => {
    expect(pageSource).toContain("Escolha o formato do PDF");
    expect(pageSource).toContain("Estornar lançamento");
    expect(pageSource).toContain("Recibo de contribuição");
    expect(pageSource).toContain(
      "<DialogContent className={TREASURY_DIALOG_CLASS}"
    );
  });
});
