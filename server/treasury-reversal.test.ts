import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const db = readFileSync("server/db.ts", "utf8");
const routers = readFileSync("server/routers.ts", "utf8");

describe("Tesouraria — estorno e datas", () => {
  it("estornar o pagamento reabre a conta a pagar vinculada", () => {
    const start = db.indexOf("export async function reverseFinancialTransaction");
    const body = db.slice(start, start + 4000);
    expect(body).toContain("financialPayables");
    expect(body).toContain('status: "aberta"');
    expect(body).toContain("financialTransactionId: null");
    expect(body).toContain("A conta a pagar vinculada foi reaberta.");
  });
  it("confirmação e estorno olham o dia civil do lançamento, sem deslocar por fuso", () => {
    expect(routers).not.toContain("new Date(existing.transactionDate).toISOString().slice(0, 10)");
    expect(routers).toContain("formatCivilDateValue(existing.transactionDate)");
  });
});
