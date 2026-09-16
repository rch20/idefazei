import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = () => readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

describe("depósitos em períodos financeiros fechados", () => {
  const saveDepositBlock = () => {
    const text = source();
    const start = text.indexOf("saveDeposit: protectedProcedure");
    const end = text.indexOf("reports: protectedProcedure", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    return text.slice(start, end);
  };

  it("consulta o fechamento usando a data do depósito e o churchId informado", () => {
    const block = saveDepositBlock();
    expect(block).toContain("isFinancialPeriodClosed(input.churchId, input.depositDate)");
    expect(block).toContain('message: "Reabra o período financeiro antes de registrar este depósito."');
  });

  it("bloqueia antes de validar conta e persistir o depósito", () => {
    const block = saveDepositBlock();
    const periodCheck = block.indexOf("isFinancialPeriodClosed");
    const accountLookup = block.indexOf("getFinancialAccountById");
    const persistence = block.indexOf("saveTreasuryDeposit");
    expect(periodCheck).toBeGreaterThanOrEqual(0);
    expect(periodCheck).toBeLessThan(accountLookup);
    expect(periodCheck).toBeLessThan(persistence);
    expect(block).toContain('code: "FORBIDDEN"');
  });

  it("mantém o vínculo tenant-aware da folha antes da regra de período", () => {
    const block = saveDepositBlock();
    expect(block).toContain("getTreasuryCountSheetById(input.countSheetId, input.churchId)");
    expect(block.indexOf("getTreasuryCountSheetById")).toBeLessThan(block.indexOf("isFinancialPeriodClosed"));
  });
});
