import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = () => readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

function blockBetween(startMarker: string, endMarker: string) {
  const text = source();
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return text.slice(start, end);
}

describe("atomicidade do fechamento e reabertura de períodos financeiros", () => {
  it("fecha período e auditoria na mesma transação com bloqueio tenant-aware", () => {
    const block = blockBetween("export async function closeFinancialPeriod", "export async function reopenFinancialPeriod");
    expect(block).toContain("return db.transaction(async (tx) => {");
    expect(block).toContain("from(financialPeriodClosures)");
    expect(block).toContain("eq(financialPeriodClosures.churchId, data.churchId)");
    expect(block).toContain('.for("update")');
    expect(block).toContain("tx.insert(financialAuditLogs)");
    expect(block).not.toContain("writeFinancialAuditLog");
  });

  it("preserva o fechamento idempotente e registra somente transições reais", () => {
    const block = blockBetween("export async function closeFinancialPeriod", "export async function reopenFinancialPeriod");
    expect(block).toContain('if (existing?.status === "fechado") return existing;');
    expect(block).toContain("closedAgain");
    expect(block).toContain('note: "Período fechado novamente após reabertura."');
    expect(block).toContain("beforeData: null");
    expect(block).toContain("afterData: created");
  });

  it("trata a corrida no primeiro fechamento sem inventar uma segunda linha", () => {
    const block = blockBetween("export async function closeFinancialPeriod", "export async function reopenFinancialPeriod");
    expect(block).toContain("if (!isDuplicateTreasuryRecord(error)) throw error;");
    expect(block).toContain("concurrentRows");
    expect(block).toContain("eq(financialPeriodClosures.churchId, data.churchId)");
  });

  it("reabre na mesma transação e não duplica log quando já está reaberto", () => {
    const block = blockBetween("export async function reopenFinancialPeriod", "// ─── PRESTAÇÃO DE CONTAS POR CULTO");
    expect(block).toContain("return db.transaction(async (tx) => {");
    expect(block).toContain('.for("update")');
    expect(block).toContain('if (!closure || closure.status === "reaberto") return closure ?? null;');
    expect(block).toContain("tx.update(financialPeriodClosures)");
    expect(block).toContain('action: "periodo_reaberto"');
    expect(block).toContain("beforeData: closure");
    expect(block).toContain("afterData: updated");
    expect(block).not.toContain("writeFinancialAuditLog");
  });
});
