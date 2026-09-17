import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dbSource = () => readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

function issueReportBlock() {
  const source = dbSource();
  const start = source.indexOf("export async function issueTreasuryReport");
  const end = source.indexOf("export type TreasuryReportSignatureResult", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("concorrência na emissão de relatórios financeiros", () => {
  it("serializa emissões do mesmo culto dentro de uma transação", () => {
    const block = issueReportBlock();
    expect(block).toContain("return db.transaction(async (tx) => {");
    expect(block).toContain("from(treasuryServices)");
    expect(block).toContain("eq(treasuryServices.id, data.serviceId)");
    expect(block).toContain("eq(treasuryServices.churchId, data.churchId)");
    expect(block).toContain('.for("update")');
  });

  it("calcula a próxima versão somente dentro do tenant e do culto bloqueado", () => {
    const block = issueReportBlock();
    expect(block).toContain("max(${treasuryReports.version})");
    expect(block).toContain("eq(treasuryReports.churchId, data.churchId)");
    expect(block).toContain("eq(treasuryReports.serviceId, data.serviceId)");
    expect(block).toContain("const version = Number(latestVersionRows[0]?.maxVersion ?? 0) + 1;");
    expect(block).not.toContain("getTreasuryReportsByChurch(data.churchId)");
  });

  it("não mistura o culto solicitado com outra folha ou outro tenant", () => {
    const block = issueReportBlock();
    expect(block).toContain("eq(treasuryCountSheets.id, data.countSheetId)");
    expect(block).toContain("eq(treasuryCountSheets.churchId, data.churchId)");
    expect(block).toContain("countSheet.serviceId !== data.serviceId");
    expect(block).toContain("eq(treasuryDeposits.churchId, data.churchId)");
    expect(block).toContain("eq(financialTransactions.churchId, data.churchId)");
  });

  it("mantém cada reemissão como um novo snapshot imutável", () => {
    const block = issueReportBlock();
    expect(block).toContain("tx.insert(treasuryReports).values");
    expect(block).toContain('status: "emitido"');
    expect(block).toContain("snapshot");
    expect(block).toContain("issuedByChurchUserId: data.actorChurchUserId");
    expect(block).toContain("reportRows = await tx.select().from(treasuryReports)");
  });

  it("não usa a contagem em memória que permitia duas emissões com a mesma versão", () => {
    const block = issueReportBlock();
    expect(block).not.toContain("existingReports.filter((report) => report.serviceId === data.serviceId).length + 1");
    expect(block).not.toContain("getTreasuryReportsByChurch(data.churchId)");
  });
});
