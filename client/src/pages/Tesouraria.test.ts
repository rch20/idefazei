import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  new URL("./Tesouraria.tsx", import.meta.url),
  "utf8"
);
const adaptiveDialogSource = readFileSync(
  new URL("../components/AdaptiveFormDialog.tsx", import.meta.url),
  "utf8"
);
const quickActionHostSource = readFileSync(
  new URL("../components/TreasuryQuickActionHost.tsx", import.meta.url),
  "utf8"
);
const quickAccessSource = readFileSync(
  new URL("../components/TreasuryQuickAccessSection.tsx", import.meta.url),
  "utf8"
);
const payablesSource = readFileSync(
  new URL("../components/TreasuryPayablesSection.tsx", import.meta.url),
  "utf8"
);
const dbSource = readFileSync(
  new URL("../../../server/db.ts", import.meta.url),
  "utf8"
);
const dbSourceNormalized = dbSource.replace(/\s+/g, " ").replace(/\s+\./g, ".");
const routerSource = readFileSync(
  new URL("../../../server/routers.ts", import.meta.url),
  "utf8"
);
const schemaSource = readFileSync(
  new URL("../../../drizzle/schema.ts", import.meta.url),
  "utf8"
);

describe("Tesouraria — regressões de interface e lógica", () => {
  it("usa papéis efetivos para controles pastorais, como a navegação", () => {
    expect(pageSource).toContain("const { churchId, churchName, accessSummary } = useChurch();");
    expect(pageSource).toContain("const effectiveRoles = useMemo");
    expect(pageSource).toContain(
      'effectiveRoles.includes("pastor_presidente")'
    );
  });

  it("substitui prompts nativos por modais controlados e roláveis", () => {
    expect(pageSource).not.toContain("window.prompt");
    expect(pageSource).toContain("periodAction");
    expect(pageSource).toContain("TREASURY_DIALOG_CLASS");
    expect(pageSource).toContain("TreasuryDialogBody");
    expect(pageSource).toContain("Motivo da reabertura");
  });

  it("mantém uma única área de scroll interno, sem overflow horizontal ou mudança de gutter", () => {
    expect(pageSource).toContain("max-h-[calc(100dvh-1rem)]");
    expect(pageSource).toContain("overflow-hidden");
    expect(pageSource).toContain(
      "overflow-x-hidden overflow-y-auto overscroll-contain"
    );
    expect(pageSource).toContain('scrollbarGutter: "stable"');
    expect(pageSource).not.toContain("max-h-[90vh] overflow-y-auto");
    expect(pageSource).toContain('DialogHeader className="shrink-0 pr-8"');
  });

  it("oferece resumo e detalhado com PDF real, prévia interna e estados pendentes", () => {
    expect(pageSource).toContain("createTreasurySummaryPdf");
    expect(pageSource).toContain("createTreasuryReportPdf");
    expect(pageSource).toContain("Resumo · 1 página");
    expect(pageSource).toContain("Relatório detalhado");
    expect(pageSource).toContain("TreasuryPdfPreview");
    expect(pageSource).toContain("Preparando PDF");
    expect(pageSource).toContain("confirmTransaction.isPending");
    expect(pageSource).toContain("reverseTransaction.isPending");
  });

  it("expõe o subtotal de contribuições online como explicação das entradas", () => {
    expect(pageSource).toContain("formatApprovedOnlineContributionsDisclosure");
    expect(pageSource).toContain(
      'aria-label="Contribuições de membros aprovadas no relatório"'
    );
    expect(pageSource.replace(/\s+/g, " ")).toContain("não é somado novamente");
  });

  it("exibe a configuração da chave PIX no tenant atual", () => {
    expect(pageSource).toContain("TreasuryQuickActionHost");
    expect(quickActionHostSource).toContain("TreasuryPixSettingsSection");
    expect(quickActionHostSource).toContain("churchId={props.churchId}");
    expect(quickActionHostSource).toContain(
      "canManageStructure={props.canManageStructure}"
    );
  });

  it("calcula o saldo somente até o fim do período e restringe contas filtradas", () => {
    expect(dbSourceNormalized).toContain(
      "endDate: data.endDate, accountId: data.accountId"
    );
    expect(dbSourceNormalized).toContain(
      "const previousPeriodEndDate = previousFinancialDate(data.startDate);"
    );
    expect(dbSourceNormalized).toContain(
      "endDate: previousPeriodEndDate, accountId: data.accountId"
    );
    expect(dbSourceNormalized).toContain(
      "openingBalanceCents: openingBalances.reduce"
    );
    expect(dbSourceNormalized).toContain(
      "formatCivilDateValue(account.createdAt) <= previousPeriodEndDate"
    );
    expect(dbSourceNormalized).toContain(
      "const accounts = data.accountId ? allAccounts.filter"
    );
    expect(pageSource).toContain('label="Saldo anterior"');
    expect(pageSource).toContain('label="Saldo atual"');
    expect(pageSource).toContain("Resultado");
  });

  it("mantém a home resumida com os quatro cards financeiros e acesso rápido", () => {
    expect(pageSource).toContain('label="Saldo anterior"');
    expect(pageSource).toContain('label="Entradas"');
    expect(pageSource).toContain('label="Saídas"');
    expect(pageSource).toContain('label="Saldo atual"');
    expect(quickAccessSource).toContain('id="treasury-quick-access-title"');
    expect(pageSource).toContain("QUICK_ACTION_TILES");
    expect(quickAccessSource).toContain("Acesso rápido");
    expect(quickAccessSource).toContain("Abrir painel");
  });

  it("organiza o acesso rápido por jornada sem remover os atalhos existentes", () => {
    expect(pageSource).toContain("QUICK_ACTION_GROUPS");
    expect(pageSource).toContain("Cultos e prestações");
    expect(pageSource).toContain("Movimentações");
    expect(pageSource).toContain("Configurações e relatórios");
    expect(pageSource).toContain("<TreasuryQuickAccessSection");
    expect(quickAccessSource).toContain("tiles.filter");
  });

  it("separa a grade de acesso rápido para limitar o trabalho da página principal", () => {
    expect(pageSource).toContain('import { TreasuryQuickAccessSection');
    expect(quickAccessSource).toContain('aria-labelledby="treasury-quick-access-title"');
    expect(quickAccessSource).toContain("onSelect(action)");
  });

  it("remove a prestação duplicada do acesso principal sem manter alias executável", () => {
    expect(pageSource).not.toContain('action: "prestacao-hoje"');
    expect(pageSource).not.toContain(
      'actions: ["programacao", "prestacao-hoje", "relatorios-culto"]'
    );
    expect(pageSource).not.toContain('if (action === "prestacao-hoje")');
    expect(pageSource).toContain('action: "programacao"');
    expect(pageSource).toContain('action: "relatorios-culto"');
  });

  it("diferencia os painéis de contribuições de membros e da página pública", () => {
    expect(pageSource).toContain('label: "Contribuições de membros"');
    expect(pageSource).toContain('label: "Doações pela página pública"');
  });

  it("abre a ficha contextual vinculada ao culto", () => {
    expect(pageSource).toContain("TreasuryServiceContext");
    expect(pageSource).toContain("TreasuryEntrySheetSection");
    expect(pageSource).toContain(
      "setEntrySheetServiceId(context?.serviceId ?? null)"
    );
    expect(pageSource).toContain("onRequestEntry={context =>");
    expect(pageSource).toContain("openEntrySheet(context)");
  });

  it("usa Registrar entrada como atalho para a ficha financeira do culto", () => {
    expect(pageSource).toContain('onClick={() => openEntrySheet()}');
    expect(pageSource).toContain(
      'aria-label="Abrir ficha financeira de entrada"'
    );
    expect(pageSource).toContain(
      "Preencher a ficha financeira de dízimos, ofertas e outras contribuições."
    );
    expect(pageSource).not.toContain(
      'onClick={() => openTransaction("entrada")}'
    );
  });

  it("mantém a visão central do culto sem criar uma segunda fonte financeira", () => {
    expect(quickActionHostSource).toContain("TreasuryServiceSection");
    expect(pageSource).toContain("serviceTransactions.invalidate()");
    expect(pageSource).toContain("Acompanhe o dinheiro da igreja por culto");
  });

  it("mantém os saldos compactos, alinhados e com altura uniforme no mobile", () => {
    expect(pageSource).toContain(
      '<section className="grid grid-cols-2 items-start gap-2.5 sm:gap-3 xl:grid-cols-4">'
    );
    expect(pageSource).toContain(
      "className={`flex min-h-[148px] flex-col gap-0 border border-slate-200 border-l-4 py-0 shadow-sm sm:min-h-[156px] ${tones[tone]}"
    );
    expect(pageSource).toContain('className="p-3 sm:p-4"');
    expect(pageSource).toContain(
      'className="mt-2 min-h-4 text-[10px] font-medium text-navy/70"'
    );
    expect(pageSource).not.toContain(
      'className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4"'
    );
  });

  it("oferece Contas a pagar como ação recolhida e abre o painel sob demanda", () => {
    expect(pageSource).toContain('action: "contas-a-pagar"');
    expect(pageSource).toContain('label: "Contas a pagar"');
    expect(pageSource).toContain('"contas-a-pagar"');
    expect(quickActionHostSource).toContain('"contas-a-pagar"');
    expect(quickActionHostSource).toContain("TreasuryPayablesSection");
    expect(payablesSource).toContain("trpc.treasury.payables.useQuery");
    expect(payablesSource).toContain("Controle operacional de obrigações");
  });

  it("preserva a fonte contábil única e o vínculo futuro da conta paga", () => {
    expect(schemaSource).toContain(
      "export const financialPayables = mysqlTable"
    );
    expect(schemaSource).toContain(
      'financialTransactionId: int("financialTransactionId")'
    );
    expect(schemaSource).toContain(
      'uniqueIndex("financial_payables_church_transaction_unique")'
    );
    expect(dbSource).toContain("getFinancialPayablesByChurch");
    expect(routerSource).toContain("payables: protectedProcedure");
    expect(routerSource).toContain(
      "requireTreasuryAccess(ctx.user.id, input.churchId)"
    );
    expect(payablesSource).toContain("não alteram os quatro saldos");
  });

  it("oferece as quatro operações da obrigação sem duplicar o lançamento", () => {
    expect(payablesSource).toContain("trpc.treasury.createPayable.useMutation");
    expect(payablesSource).toContain("trpc.treasury.updatePayable.useMutation");
    expect(payablesSource).toContain("trpc.treasury.cancelPayable.useMutation");
    expect(payablesSource).toContain("trpc.treasury.payPayable.useMutation");
    expect(payablesSource).toContain("Confirmar pagamento");
    expect(payablesSource).toContain("Baixa vinculada à saída #");
    expect(payablesSource).toContain("Uma única saída confirmada");
    expect(routerSource).toContain("payPayable: protectedProcedure");
    expect(dbSource).toContain("financialTransactionId: transactionId");
  });

  it("mantém Contas a pagar utilizável em viewport estreita", () => {
    expect(payablesSource).toContain(
      'AdaptiveFormDialogContent className="sm:max-w-2xl"'
    );
    expect(payablesSource).toContain(
      'AdaptiveFormDialogContent className="sm:max-w-xl"'
    );
    expect(payablesSource).toContain("AdaptiveFormDialogBody");
    expect(payablesSource).toContain("AdaptiveFormDialogFooter");
    expect(payablesSource).toContain('className="contents"');
    expect(payablesSource).toContain("Salvar alterações");
    expect(payablesSource).toContain("Salvar conta");
    expect(payablesSource).toContain("Confirmar pagamento");
    expect(payablesSource).toContain("Confirmar cancelamento");
  });

  it("abre módulos recolhidos em host ou modal e limpa a ação ao fechar", () => {
    expect(pageSource).toContain("TreasuryQuickActionHost");
    expect(pageSource).toContain("const [quickAction, setQuickAction]");
    expect(pageSource).toContain("setQuickActionBusy(false)");
    expect(pageSource).toContain("onBusyChange={setQuickActionBusy}");
    expect(pageSource).toContain('quickAction === "livro-caixa"');
    expect(pageSource).toContain('quickAction === "categorias-contas"');
    expect(pageSource).toContain('quickAction === "fechamento"');
    expect(pageSource).toContain("sm:max-w-6xl");
    expect(pageSource).toContain(
      "overflow-x-hidden overflow-y-auto overscroll-contain"
    );
  });

  it("leva Entradas e Saídas ao Livro-caixa sem criar uma consulta financeira nova", () => {
    expect(pageSource).toContain('onClick={() => focusBookFilter("entrada")}');
    expect(pageSource).toContain('onClick={() => focusBookFilter("saida")}');
    expect(pageSource).toContain("const filteredTransactions");
    expect(pageSource).toContain(
      'scrollIntoView({ behavior: "smooth", block: "start" })'
    );
    expect(pageSource).toContain("Filtro: {bookFilterLabel}");
    expect(pageSource).toContain("Limpar filtro");
    expect(pageSource).toContain('role={interactive ? "button" : undefined}');
    expect(pageSource).toContain("Ver no Livro-caixa");
  });

  it("projeta somente id e nome do contribuinte no recibo", () => {
    expect(dbSourceNormalized).toContain(
      "db.select({ id: people.id, fullName: people.fullName })"
    );
  });

  it("oferece gestão separada de categorias sem apagar histórico financeiro", () => {
    expect(pageSource).toContain("categoriesManagement.useQuery");
    expect(pageSource).toContain("Gerenciar categorias");
    expect(pageSource).toContain("Editar categoria");
    expect(pageSource).toContain("Inativar categoria");
    expect(pageSource).toContain("Reativar categoria");
    expect(pageSource).toContain("As categorias padrão são protegidas");
    expect(dbSource).toContain("getFinancialCategoriesForManagement");
    expect(dbSource).toContain("hasFinancialCategoryTransactions");
    expect(dbSource).toContain("setFinancialCategoryActive");
  });

  it("confirma e estorna de forma atômica antes de registrar auditoria", () => {
    expect(dbSourceNormalized).toContain("return db.transaction(async tx =>");
    expect(dbSourceNormalized).toContain("affectedRows?: number");
    expect(dbSourceNormalized).toContain("tx.insert(financialAuditLogs)");
  });

  it("mantém o botão de confirmar entrada acessível acima da barra inferior", () => {
    expect(pageSource).toContain("AdaptiveFormDialogContent");
    expect(pageSource).toContain(
      '<AdaptiveFormDialogContent className="sm:max-w-4xl">'
    );
    expect(pageSource).toContain("AdaptiveFormDialogFooter");
    expect(adaptiveDialogSource).toContain("env(safe-area-inset-bottom)");
    expect(adaptiveDialogSource).toContain("sticky bottom-0");
    expect(adaptiveDialogSource).toContain("[&>button]:min-h-11");
    expect(pageSource).toContain("Salvar entrada");
    expect(pageSource).toContain("Salvar saída");
  });

  it("mantém os modais financeiros acima da navegação móvel e com saída clara", () => {
    expect(pageSource).toContain('"!flex z-[200]');
    expect(adaptiveDialogSource).toContain("z-[200]");
    expect(pageSource).toContain("Fechar e voltar ao Acesso rápido");
    expect(pageSource).toContain("onClick={() => setTransactionOpen(false)}");
    expect(pageSource).toContain("onClick={() => setAccountOpen(false)}");
    expect(pageSource).toContain("onClick={() => setCategoryOpen(false)}");
    expect(pageSource).toContain("Confirmar fechamento");
    expect(pageSource).toContain("TreasuryPdfPreview");
  });

  it("apresenta ícones discretos nas formas de recebimento sem remover o seletor nativo", () => {
    expect(pageSource).toContain("function PaymentMethodIcon");
    expect(pageSource).toContain("WalletCards");
    expect(pageSource).toContain("QrCode");
    expect(pageSource).toContain("ArrowRightLeft");
    expect(pageSource).toContain("CreditCard");
    expect(pageSource).toContain('aria-hidden="true"');
    expect(pageSource).toContain(
      'aria-label={`Forma de ${form.type === "entrada" ? "recebimento" : "pagamento"}`}'
    );
    expect(pageSource).toContain("PAYMENT_METHODS.map");
    expect(pageSource).toContain("pl-10 pr-3");
  });

  it("limpa o feedback antigo quando o usuário corrige o formulário", () => {
    expect(pageSource).toContain(
      "const updateTransactionForm = (patch: Partial<typeof form>) =>"
    );
    expect(pageSource).toContain("setFormError(null);");
    expect(pageSource).toContain("createTransaction.reset();");
  });

  it("mantém erro de validação visível dentro do formulário de entrada", () => {
    expect(pageSource).toContain("(formError || createTransaction.error)");
    expect(pageSource).toContain("Não foi possível registrar o lançamento.");
    expect(pageSource).toContain('role="alert"');
  });
});
