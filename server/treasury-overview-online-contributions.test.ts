import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

function sourceBlock(signature: string, nextSignature: string) {
  const start = dbSource.indexOf(signature);
  const end = dbSource.indexOf(nextSignature, start + signature.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return dbSource.slice(start, end);
}

describe("overview mensal: contribuições on-line aprovadas", () => {
  it("deriva o subtotal pelo vínculo financeiro, tenant, status, competência e conta", () => {
    const summary = sourceBlock(
      "async function getApprovedOnlineContributionSummary",
      "export async function getTreasuryOverview"
    );
    expect(dbSource).toContain("onlineContributions,");
    expect(summary).toContain(
      "eq(onlineContributions.churchId, data.churchId)"
    );
    expect(summary).toContain('eq(onlineContributions.status, "aprovada")');
    expect(summary).toContain('eq(financialTransactions.status, "confirmado")');
    expect(summary).toContain('eq(financialTransactions.type, "entrada")');
    expect(summary).toContain(
      "eq(financialTransactions.id, onlineContributions.financialTransactionId)"
    );
    expect(summary).toContain(
      "eq(financialTransactions.churchId, data.churchId)"
    );
    expect(summary).toContain(
      "DATE(${financialTransactions.transactionDate}) >= DATE(${data.startDate})"
    );
    expect(summary).toContain(
      "DATE(${financialTransactions.transactionDate}) <= DATE(${data.endDate})"
    );
    expect(summary).toContain(
      "eq(financialTransactions.accountId, data.accountId)"
    );
    expect(summary).toContain(
      "COALESCE(SUM(${financialTransactions.amountCents}), 0)"
    );
    expect(summary).toContain("COUNT(*)");
  });

  it("retorna a explicação separada e preserva a soma única do livro-caixa", () => {
    const overview = sourceBlock(
      "export async function getTreasuryOverview",
      "async function writeFinancialAuditLog"
    );
    expect(overview).toContain("getApprovedOnlineContributionSummary(data)");
    expect(overview).toContain("...approvedOnlineContributionSummary");
    expect(overview).toContain(
      'const entriesCents = sumByType("entrada", confirmedPeriodRows);'
    );
    expect(overview).not.toContain(
      "entriesCents + approvedOnlineContributionsCents"
    );
    expect(overview).not.toContain(
      "entriesCents += approvedOnlineContributionsCents"
    );
  });
});

export {};
