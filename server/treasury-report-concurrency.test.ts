import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const compactSource = (source: string) =>
  source
    .replace(/\s+/g, " ")
    .replace(/\basync\s+\(\s*([A-Za-z_$][\w$]*)\s*\)/g, "async $1")
    .replace(/\(\s*([A-Za-z_$][\w$]*)\s*\)\s*=>/g, "$1 =>")
    .replace(/\s+\./g, ".")
    .replace(/\.\s+/g, ".")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/,\s*}/g, "}")
    .replace(/\s+}/g, "}")
    .trim();
const dbSource = () =>
  compactSource(readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8"));

function issueReportBlock() {
  const source = dbSource();
  const start = source.indexOf("export async function issueTreasuryReport");
  const end = source.indexOf(
    "export type TreasuryReportSignatureResult",
    start
  );
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("concorrência na emissão de relatórios financeiros", () => {
  it("serializa emissões do mesmo culto dentro de uma transação", () => {
    const block = issueReportBlock();
    expect(block).toContain(
      compactSource("return db.transaction(async (tx) => {")
    );
    expect(block).toContain(compactSource("from(treasuryServices)"));
    expect(block).toContain(
      compactSource("eq(treasuryServices.id, data.serviceId)")
    );
    expect(block).toContain(
      compactSource("eq(treasuryServices.churchId, data.churchId)")
    );
    expect(block).toContain('.for("update")');
  });

  it("calcula a próxima versão somente dentro do tenant e do culto bloqueado", () => {
    const block = issueReportBlock();
    expect(block).toContain(compactSource("max(${treasuryReports.version})"));
    expect(block).toContain(
      compactSource("eq(treasuryReports.churchId, data.churchId)")
    );
    expect(block).toContain(
      compactSource("eq(treasuryReports.serviceId, data.serviceId)")
    );
    expect(block).toContain(
      compactSource(
        "const version = Number(latestVersionRows[0]?.maxVersion ?? 0) + 1;"
      )
    );
    expect(block).not.toContain(
      compactSource("getTreasuryReportsByChurch(data.churchId)")
    );
  });

  it("não mistura o culto solicitado com outra folha ou outro tenant", () => {
    const block = issueReportBlock();
    expect(block).toContain(
      compactSource("eq(treasuryCountSheets.id, data.countSheetId)")
    );
    expect(block).toContain(
      compactSource("eq(treasuryCountSheets.churchId, data.churchId)")
    );
    expect(block).toContain(
      compactSource("countSheet.serviceId !== data.serviceId")
    );
    expect(block).toContain(
      compactSource("eq(treasuryDeposits.churchId, data.churchId)")
    );
    expect(block).toContain(
      compactSource("eq(financialTransactions.churchId, data.churchId)")
    );
  });

  it("mantém cada reemissão como um novo snapshot imutável", () => {
    const block = issueReportBlock();
    expect(block).toContain(compactSource("tx.insert(treasuryReports).values"));
    expect(block).toContain('status: "emitido"');
    expect(block).toContain(compactSource("snapshot"));
    expect(block).toContain(
      compactSource("issuedByChurchUserId: data.actorChurchUserId")
    );
    expect(block).toContain(
      compactSource("reportRows = await tx.select().from(treasuryReports)")
    );
  });

  it("não usa a contagem em memória que permitia duas emissões com a mesma versão", () => {
    const block = issueReportBlock();
    expect(block).not.toContain(
      compactSource(
        "existingReports.filter((report) => report.serviceId === data.serviceId).length + 1"
      )
    );
    expect(block).not.toContain(
      compactSource("getTreasuryReportsByChurch(data.churchId)")
    );
  });
});
