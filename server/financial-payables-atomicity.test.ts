import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const migrationSource = readFileSync(
  resolve(root, "drizzle/0089_financial_payables.sql"),
  "utf8"
);

function blockBetween(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("contas a pagar — integridade financeira", () => {
  it("cria a obrigação e a auditoria na mesma transação", () => {
    const block = blockBetween(
      dbSource,
      "export async function createFinancialPayable",
      "export async function updateFinancialPayable"
    );
    expect(block).toContain("return db.transaction(async tx => {");
    expect(block).toContain("eq(financialPayables.churchId, data.churchId)");
    expect(block).toContain("tx.insert(financialPayables)");
    expect(block).toContain('action: "conta_pagar_criada"');
    expect(block).toContain("tx.insert(financialAuditLogs)");
  });

  it("edita e cancela somente uma obrigação aberta do tenant", () => {
    const updateBlock = blockBetween(
      dbSource,
      "export async function updateFinancialPayable",
      "export async function cancelFinancialPayable"
    );
    const cancelBlock = blockBetween(
      dbSource,
      "export async function cancelFinancialPayable",
      "export async function payFinancialPayable"
    );
    for (const block of [updateBlock, cancelBlock]) {
      expect(block).toContain("return db.transaction(async tx => {");
      expect(block).toContain("eq(financialPayables.churchId, data.churchId)");
      expect(block).toContain('eq(financialPayables.status, "aberta")');
      expect(block).toContain("tx.insert(financialAuditLogs)");
    }
    expect(updateBlock).toContain('action: "conta_pagar_atualizada"');
    expect(cancelBlock).toContain('status: "cancelada"');
    expect(cancelBlock).toContain('action: "conta_pagar_cancelada"');
  });

  it("paga com uma única saída confirmada e vínculo exclusivo", () => {
    const block = dbSource.slice(
      dbSource.indexOf("export async function payFinancialPayable")
    );
    expect(block).toContain("return db.transaction(async tx => {");
    expect(block).toContain("isNull(financialPayables.financialTransactionId)");
    expect(block).toContain('type: "saida"');
    expect(block).toContain('status: "confirmado"');
    expect(block).toContain("amountCents: payable.amountCents");
    expect(block).toContain("financialTransactionId: transactionId");
    expect(block).toContain('action: "confirmado"');
    expect(block).toContain('action: "conta_pagar_paga"');
    expect(block).toContain("financialTransactions");
  });

  it("protege as quatro mutations com sessão de Tesouraria e bloqueia período fechado", () => {
    for (const procedure of [
      "createPayable",
      "updatePayable",
      "cancelPayable",
      "payPayable",
    ]) {
      const start = routerSource.indexOf(`  ${procedure}: protectedProcedure`);
      expect(start).toBeGreaterThanOrEqual(0);
      const end = routerSource.indexOf("\n\n  ", start + 4);
      const block = routerSource.slice(start, end > start ? end : start + 1800);
      expect(block).toContain(
        "requireTreasuryAccess(ctx.user.id, input.churchId)"
      );
    }
    const paymentBlock = blockBetween(
      routerSource,
      "  payPayable: protectedProcedure",
      "  pixForMember: protectedProcedure"
    );
    expect(paymentBlock).toContain(
      "isFinancialPeriodClosed(input.churchId, input.paymentDate)"
    );
    expect(paymentBlock).toContain("requirePaymentReferences: true");
  });

  it("mantém a migration recuperável em caso de falha após ADD COLUMN ou ADD INDEX", () => {
    expect(migrationSource).toContain(
      "CREATE TABLE IF NOT EXISTS financial_payables"
    );
    expect(migrationSource).toContain(
      "ADD COLUMN IF NOT EXISTS payableId INT NULL"
    );
    expect(migrationSource).toContain(
      "CREATE INDEX IF NOT EXISTS financial_audit_logs_payable_idx"
    );
    expect(migrationSource).toContain(
      "UNIQUE KEY financial_payables_church_transaction_unique"
    );
  });
});
