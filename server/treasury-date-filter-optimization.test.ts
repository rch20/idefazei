import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const migrationSource = readFileSync(
  resolve(root, "drizzle/0085_financial_transaction_date_index.sql"),
  "utf8"
);
const migrationLedger = JSON.parse(
  readFileSync(resolve(root, "drizzle/custom-migrations.json"), "utf8")
) as {
  entries: Array<{ id: string; file: string; sha256: string }>;
};

function functionBody(
  source: string,
  signature: string,
  nextSignature: string
) {
  const start = source.indexOf(signature);
  const end = source.indexOf(nextSignature, start + signature.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("Tesouraria: filtros de data indexáveis", () => {
  it("compara o fechamento financeiro com limites Date sem envolver as colunas em DATE()", () => {
    const body = functionBody(
      dbSource,
      "export async function isFinancialPeriodClosed",
      "type FinancialTransactionFilters"
    );

    expect(body).toContain(
      "lte(financialPeriodClosures.periodStart, financialDate(transactionDate))"
    );
    expect(body).toContain(
      "gte(financialPeriodClosures.periodEnd, financialDate(transactionDate))"
    );
    expect(body).not.toContain("DATE(${financialPeriodClosures.periodStart})");
    expect(body).not.toContain("DATE(${financialPeriodClosures.periodEnd})");
  });

  it("usa os limites inclusivos diretamente sobre transactionDate", () => {
    const body = functionBody(
      dbSource,
      "export async function getFinancialTransactions",
      "async function getApprovedOnlineContributionSummary"
    );

    expect(body).toContain(
      "gte(financialTransactions.transactionDate, financialDate(filters.startDate))"
    );
    expect(body).toContain(
      "lte(financialTransactions.transactionDate, financialDate(filters.endDate))"
    );
    expect(body).not.toContain(
      "DATE(${financialTransactions.transactionDate})"
    );
    expect(body).toContain(
      "eq(financialTransactions.churchId, filters.churchId)"
    );
  });
});

describe("Tesouraria: índice de competência por tenant", () => {
  it("mantém o índice no schema e na migration 0085", () => {
    expect(schemaSource).toContain(
      'index("financial_transactions_church_date_idx").on(table.churchId, table.transactionDate)'
    );
    expect(migrationSource).toContain(
      "CREATE INDEX `financial_transactions_church_date_idx`"
    );
    expect(migrationSource).toContain(
      "ON `financial_transactions` (`churchId`, `transactionDate`)"
    );
  });

  it("registra a migration 0085 no ledger customizado", () => {
    const entry = migrationLedger.entries.find(
      candidate => candidate.id === "0085"
    );

    expect(entry).toMatchObject({
      id: "0085",
      file: "drizzle/0085_financial_transaction_date_index.sql",
      sha256:
        "0f5c7b71cc8cab0b0d233145c68f5e156d75216d5204f4328d55b89756fbf540",
    });
  });
});

export {};
