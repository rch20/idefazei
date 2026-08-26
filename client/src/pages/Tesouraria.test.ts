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
    expect(pageSource).toContain('max-h-[90vh] overflow-y-auto');
    expect(pageSource).toContain("Motivo da reabertura");
  });

  it("usa relatório dedicado e estados pendentes nos botões críticos", () => {
    expect(pageSource).toContain("buildTreasuryReportHtml");
    expect(pageSource).toContain("Gerar PDF");
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

  it("confirma e estorna de forma atômica antes de registrar auditoria", () => {
    expect(dbSource).toContain("return db.transaction(async (tx) =>");
    expect(dbSource).toContain("affectedRows?: number");
    expect(dbSource).toContain("tx.insert(financialAuditLogs)");
  });
});
