import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(new URL("./Tesouraria.tsx", import.meta.url), "utf8");
const dbSource = readFileSync(new URL("../../../server/db.ts", import.meta.url), "utf8");

describe("Tesouraria — regressões de interface e lógica", () => {
  it("usa papéis efetivos para controles pastorais, como a navegação", () => {
    expect(pageSource).toContain("trpc.churchAuth.effectiveRoles.useQuery");
    expect(pageSource).toContain("const effectiveRoles = useMemo");
    expect(pageSource).toContain('effectiveRoles.includes("pastor_presidente")');
  });

  it("substitui prompts nativos por modais controlados e roláveis", () => {
    expect(pageSource).not.toContain("window.prompt");
    expect(pageSource).toContain("periodAction");
    expect(pageSource).toContain("TREASURY_DIALOG_CLASS");
    expect(pageSource).toContain("TreasuryDialogBody");
    expect(pageSource).toContain("Motivo da reabertura");
  });

  it("mantém uma única área de scroll interno, sem overflow horizontal ou mudança de gutter", () => {
    expect(pageSource).toContain('max-h-[calc(100dvh-1rem)]');
    expect(pageSource).toContain("overflow-hidden");
    expect(pageSource).toContain("overflow-x-hidden overflow-y-auto overscroll-contain");
    expect(pageSource).toContain('scrollbarGutter: "stable"');
    expect(pageSource).not.toContain('max-h-[90vh] overflow-y-auto');
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

  it("calcula o saldo somente até o fim do período e restringe contas filtradas", () => {
    expect(dbSource).toContain("endDate: data.endDate, accountId: data.accountId");
    expect(dbSource).toContain("const accounts = data.accountId ? allAccounts.filter");
  });

  it("projeta somente id e nome do contribuinte no recibo", () => {
    expect(dbSource).toContain("db.select({ id: people.id, fullName: people.fullName })");
    expect(dbSource).not.toContain("transaction.contributorPersonId ? getPersonById(transaction.contributorPersonId, churchId)");
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
    expect(dbSource).toContain("return db.transaction(async (tx) =>");
    expect(dbSource).toContain("affectedRows?: number");
    expect(dbSource).toContain("tx.insert(financialAuditLogs)");
  });
});
