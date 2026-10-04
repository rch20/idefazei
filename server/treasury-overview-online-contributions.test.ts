import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

type OverviewInput = {
  churchId: number;
  startDate: string;
  endDate: string;
  accountId?: number;
};

type MockContribution = {
  id: number;
  churchId: number;
  status: "pendente" | "aprovada" | "recusada";
  financialTransactionId: number | null;
  confirmedAmountCents: number | null;
};

type MockFinancialTransaction = {
  id: number;
  churchId: number;
  accountId: number;
  type: "entrada" | "saida";
  amountCents: number;
  transactionDate: string;
  status: "rascunho" | "confirmado" | "estornado";
};

type MockedOverview = {
  entriesCents: number;
  approvedOnlineContributionsCents: number;
  approvedOnlineContributionsCount: number;
};

const period: OverviewInput = {
  churchId: 1,
  startDate: "2026-08-01",
  endDate: "2026-08-31",
};

function sourceBlock(signature: string, nextSignature: string) {
  const start = dbSource.indexOf(signature);
  const end = dbSource.indexOf(nextSignature, start + signature.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return dbSource.slice(start, end);
}

function isInPeriod(
  transaction: MockFinancialTransaction,
  input: OverviewInput
) {
  return (
    transaction.transactionDate >= input.startDate &&
    transaction.transactionDate <= input.endDate
  );
}

/**
 * Simula o conjunto de linhas produzido pelo JOIN do overview, sem conectar ao banco.
 * O valor do subtotal sempre vem do lançamento financeiro, nunca de confirmedAmountCents.
 */
function summarizeMockedOverview(
  contributions: MockContribution[],
  financialTransactions: MockFinancialTransaction[],
  input: OverviewInput
): MockedOverview {
  const matchesAccount = (transaction: MockFinancialTransaction) =>
    input.accountId === undefined || transaction.accountId === input.accountId;
  const confirmedPeriodEntries = financialTransactions.filter(
    transaction =>
      transaction.churchId === input.churchId &&
      transaction.status === "confirmado" &&
      transaction.type === "entrada" &&
      isInPeriod(transaction, input) &&
      matchesAccount(transaction)
  );
  const linkedApprovedRows = contributions
    .map(contribution => ({
      contribution,
      transaction: financialTransactions.find(
        transaction =>
          transaction.id === contribution.financialTransactionId &&
          transaction.churchId === input.churchId
      ),
    }))
    .filter(
      (
        row
      ): row is {
        contribution: MockContribution;
        transaction: MockFinancialTransaction;
      } =>
        row.transaction !== undefined &&
        row.contribution.churchId === input.churchId &&
        row.contribution.status === "aprovada" &&
        row.transaction.status === "confirmado" &&
        row.transaction.type === "entrada" &&
        isInPeriod(row.transaction, input) &&
        matchesAccount(row.transaction)
    );

  return {
    entriesCents: confirmedPeriodEntries.reduce(
      (total, transaction) => total + transaction.amountCents,
      0
    ),
    approvedOnlineContributionsCents: linkedApprovedRows.reduce(
      (total, row) => total + row.transaction.amountCents,
      0
    ),
    approvedOnlineContributionsCount: linkedApprovedRows.length,
  };
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

  it("conta uma contribuição aprovada uma única vez e mantém o subtotal dentro das entradas", () => {
    const result = summarizeMockedOverview(
      [
        {
          id: 1,
          churchId: 1,
          status: "aprovada",
          financialTransactionId: 101,
          confirmedAmountCents: 9_500,
        },
      ],
      [
        {
          id: 101,
          churchId: 1,
          accountId: 10,
          type: "entrada",
          amountCents: 10_000,
          transactionDate: "2026-08-10",
          status: "confirmado",
        },
        {
          id: 102,
          churchId: 1,
          accountId: 10,
          type: "entrada",
          amountCents: 5_000,
          transactionDate: "2026-08-15",
          status: "confirmado",
        },
      ],
      period
    );

    expect(result).toEqual({
      entriesCents: 15_000,
      approvedOnlineContributionsCents: 10_000,
      approvedOnlineContributionsCount: 1,
    });
    const monthlyTotalCents = result.entriesCents;
    expect(monthlyTotalCents).toBe(15_000);
    expect(monthlyTotalCents).not.toBe(
      result.entriesCents + result.approvedOnlineContributionsCents
    );
  });

  it("não conta contribuição pendente", () => {
    const result = summarizeMockedOverview(
      [
        {
          id: 2,
          churchId: 1,
          status: "pendente",
          financialTransactionId: null,
          confirmedAmountCents: null,
        },
      ],
      [
        {
          id: 201,
          churchId: 1,
          accountId: 10,
          type: "entrada",
          amountCents: 5_000,
          transactionDate: "2026-08-10",
          status: "confirmado",
        },
      ],
      period
    );

    expect(result.approvedOnlineContributionsCents).toBe(0);
    expect(result.approvedOnlineContributionsCount).toBe(0);
    expect(result.entriesCents).toBe(5_000);
  });

  it("não conta contribuição recusada", () => {
    const result = summarizeMockedOverview(
      [
        {
          id: 3,
          churchId: 1,
          status: "recusada",
          financialTransactionId: null,
          confirmedAmountCents: null,
        },
      ],
      [
        {
          id: 301,
          churchId: 1,
          accountId: 10,
          type: "entrada",
          amountCents: 6_000,
          transactionDate: "2026-08-11",
          status: "confirmado",
        },
      ],
      period
    );

    expect(result.approvedOnlineContributionsCents).toBe(0);
    expect(result.approvedOnlineContributionsCount).toBe(0);
    expect(result.entriesCents).toBe(6_000);
  });

  it("não conta lançamento estornado mesmo com solicitação aprovada", () => {
    const result = summarizeMockedOverview(
      [
        {
          id: 4,
          churchId: 1,
          status: "aprovada",
          financialTransactionId: 401,
          confirmedAmountCents: 8_000,
        },
      ],
      [
        {
          id: 401,
          churchId: 1,
          accountId: 10,
          type: "entrada",
          amountCents: 8_000,
          transactionDate: "2026-08-12",
          status: "estornado",
        },
      ],
      period
    );

    expect(result).toEqual({
      entriesCents: 0,
      approvedOnlineContributionsCents: 0,
      approvedOnlineContributionsCount: 0,
    });
  });

  it("isola contribuições de outro tenant", () => {
    const result = summarizeMockedOverview(
      [
        {
          id: 5,
          churchId: 2,
          status: "aprovada",
          financialTransactionId: 501,
          confirmedAmountCents: 12_000,
        },
      ],
      [
        {
          id: 501,
          churchId: 2,
          accountId: 10,
          type: "entrada",
          amountCents: 12_000,
          transactionDate: "2026-08-13",
          status: "confirmado",
        },
        {
          id: 502,
          churchId: 1,
          accountId: 10,
          type: "entrada",
          amountCents: 3_000,
          transactionDate: "2026-08-13",
          status: "confirmado",
        },
      ],
      period
    );

    expect(result.approvedOnlineContributionsCents).toBe(0);
    expect(result.approvedOnlineContributionsCount).toBe(0);
    expect(result.entriesCents).toBe(3_000);
  });

  it("não atravessa o tenant quando contribuição e lançamento estão vinculados a igrejas diferentes", () => {
    const result = summarizeMockedOverview(
      [
        {
          id: 51,
          churchId: 1,
          status: "aprovada",
          financialTransactionId: 511,
          confirmedAmountCents: 11_000,
        },
        {
          id: 52,
          churchId: 2,
          status: "aprovada",
          financialTransactionId: 512,
          confirmedAmountCents: 22_000,
        },
      ],
      [
        {
          id: 511,
          churchId: 2,
          accountId: 10,
          type: "entrada",
          amountCents: 11_000,
          transactionDate: "2026-08-13",
          status: "confirmado",
        },
        {
          id: 512,
          churchId: 1,
          accountId: 10,
          type: "entrada",
          amountCents: 22_000,
          transactionDate: "2026-08-13",
          status: "confirmado",
        },
        {
          id: 513,
          churchId: 1,
          accountId: 10,
          type: "entrada",
          amountCents: 3_500,
          transactionDate: "2026-08-13",
          status: "confirmado",
        },
      ],
      period
    );

    expect(result.approvedOnlineContributionsCents).toBe(0);
    expect(result.approvedOnlineContributionsCount).toBe(0);
    expect(result.entriesCents).toBe(25_500);
  });

  it("inclui os limites da competência e exclui datas fora do período", () => {
    const contributions: MockContribution[] = [
      {
        id: 61,
        churchId: 1,
        status: "aprovada",
        financialTransactionId: 601,
        confirmedAmountCents: 1_000,
      },
      {
        id: 62,
        churchId: 1,
        status: "aprovada",
        financialTransactionId: 602,
        confirmedAmountCents: 2_000,
      },
      {
        id: 63,
        churchId: 1,
        status: "aprovada",
        financialTransactionId: 603,
        confirmedAmountCents: 4_000,
      },
      {
        id: 64,
        churchId: 1,
        status: "aprovada",
        financialTransactionId: 604,
        confirmedAmountCents: 8_000,
      },
    ];
    const transactions: MockFinancialTransaction[] = [
      {
        id: 601,
        churchId: 1,
        accountId: 10,
        type: "entrada",
        amountCents: 1_000,
        transactionDate: "2026-08-01",
        status: "confirmado",
      },
      {
        id: 602,
        churchId: 1,
        accountId: 10,
        type: "entrada",
        amountCents: 2_000,
        transactionDate: "2026-08-31",
        status: "confirmado",
      },
      {
        id: 603,
        churchId: 1,
        accountId: 10,
        type: "entrada",
        amountCents: 4_000,
        transactionDate: "2026-07-31",
        status: "confirmado",
      },
      {
        id: 604,
        churchId: 1,
        accountId: 10,
        type: "entrada",
        amountCents: 8_000,
        transactionDate: "2026-09-01",
        status: "confirmado",
      },
    ];

    const result = summarizeMockedOverview(contributions, transactions, period);

    expect(result.approvedOnlineContributionsCents).toBe(3_000);
    expect(result.approvedOnlineContributionsCount).toBe(2);
    expect(result.entriesCents).toBe(3_000);
  });

  it("trata uma competência de um único dia como intervalo inclusivo", () => {
    const singleDayPeriod = {
      churchId: 1,
      startDate: "2026-08-31",
      endDate: "2026-08-31",
    };
    const result = summarizeMockedOverview(
      [
        {
          id: 65,
          churchId: 1,
          status: "aprovada",
          financialTransactionId: 651,
          confirmedAmountCents: 6_500,
        },
        {
          id: 66,
          churchId: 1,
          status: "aprovada",
          financialTransactionId: 652,
          confirmedAmountCents: 6_600,
        },
        {
          id: 67,
          churchId: 1,
          status: "aprovada",
          financialTransactionId: 653,
          confirmedAmountCents: 6_700,
        },
      ],
      [
        {
          id: 651,
          churchId: 1,
          accountId: 10,
          type: "entrada",
          amountCents: 6_500,
          transactionDate: "2026-08-30",
          status: "confirmado",
        },
        {
          id: 652,
          churchId: 1,
          accountId: 10,
          type: "entrada",
          amountCents: 6_600,
          transactionDate: "2026-08-31",
          status: "confirmado",
        },
        {
          id: 653,
          churchId: 1,
          accountId: 10,
          type: "entrada",
          amountCents: 6_700,
          transactionDate: "2026-09-01",
          status: "confirmado",
        },
      ],
      singleDayPeriod
    );

    expect(result.approvedOnlineContributionsCents).toBe(6_600);
    expect(result.approvedOnlineContributionsCount).toBe(1);
    expect(result.entriesCents).toBe(6_600);
  });

  it("não inclui lançamentos quando a competência está invertida", () => {
    const result = summarizeMockedOverview(
      [
        {
          id: 68,
          churchId: 1,
          status: "aprovada",
          financialTransactionId: 681,
          confirmedAmountCents: 6_800,
        },
      ],
      [
        {
          id: 681,
          churchId: 1,
          accountId: 10,
          type: "entrada",
          amountCents: 6_800,
          transactionDate: "2026-08-15",
          status: "confirmado",
        },
      ],
      {
        churchId: 1,
        startDate: "2026-08-31",
        endDate: "2026-08-01",
      }
    );

    expect(result).toEqual({
      entriesCents: 0,
      approvedOnlineContributionsCents: 0,
      approvedOnlineContributionsCount: 0,
    });
  });

  it("respeita o filtro de conta selecionada", () => {
    const result = summarizeMockedOverview(
      [
        {
          id: 71,
          churchId: 1,
          status: "aprovada",
          financialTransactionId: 701,
          confirmedAmountCents: 4_000,
        },
        {
          id: 72,
          churchId: 1,
          status: "aprovada",
          financialTransactionId: 702,
          confirmedAmountCents: 7_000,
        },
      ],
      [
        {
          id: 701,
          churchId: 1,
          accountId: 10,
          type: "entrada",
          amountCents: 4_000,
          transactionDate: "2026-08-14",
          status: "confirmado",
        },
        {
          id: 702,
          churchId: 1,
          accountId: 20,
          type: "entrada",
          amountCents: 7_000,
          transactionDate: "2026-08-14",
          status: "confirmado",
        },
      ],
      { ...period, accountId: 10 }
    );

    expect(result).toEqual({
      entriesCents: 4_000,
      approvedOnlineContributionsCents: 4_000,
      approvedOnlineContributionsCount: 1,
    });
  });

  it("usa o valor canônico do lançamento financeiro, não confirmedAmountCents", () => {
    const result = summarizeMockedOverview(
      [
        {
          id: 8,
          churchId: 1,
          status: "aprovada",
          financialTransactionId: 801,
          confirmedAmountCents: 1_234,
        },
      ],
      [
        {
          id: 801,
          churchId: 1,
          accountId: 10,
          type: "entrada",
          amountCents: 12_345,
          transactionDate: "2026-08-20",
          status: "confirmado",
        },
      ],
      period
    );

    expect(result.approvedOnlineContributionsCents).toBe(12_345);
    expect(result.approvedOnlineContributionsCents).not.toBe(1_234);
    expect(result.entriesCents).toBe(12_345);
  });
});

export {};
