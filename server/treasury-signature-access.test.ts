import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = () => readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const dbSource = () => readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const schema = () => readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
const migration = () => readFileSync(resolve(process.cwd(), "drizzle/0070_treasury_report_signatures.sql"), "utf8");

describe("autorização de assinatura de relatório financeiro", () => {
  it("resolve relatório e folha dentro do churchId antes de autorizar", () => {
    const text = source();
    expect(text).toContain("requireTreasuryReportSignaturePermission");
    expect(text).toContain("getTreasuryReportById(reportId, churchId)");
    expect(text).toContain("getTreasuryCountSheetById(report.countSheetId, churchId)");
  });

  it("vincula contador1 e contador2 à Pessoa da folha", () => {
    const text = source();
    expect(text).toContain("actorPersonId === countSheet.counterOnePersonId");
    expect(text).toContain("actorPersonId === countSheet.counterTwoPersonId");
    expect(text).toContain('(requestedRole === "contador1" && isCounterOne)');
    expect(text).toContain('(requestedRole === "contador2" && isCounterTwo)');
  });

  it("resolve tesoureiro e pastor pelas funções server-side", () => {
    const text = source();
    expect(text).toContain('access.roles.includes("tesoureiro")');
    expect(text).toContain("access.roles.some((role) => PASTOR_ROLES.has(role))");
    expect(text).toContain('(requestedRole === "tesoureiro" && isTreasurer)');
    expect(text).toContain('(requestedRole === "pastor" && isPastor)');
  });

  it("rejeita papel incompatível antes de chamar a persistência", () => {
    const text = source();
    const helperStart = text.indexOf("async function requireTreasuryReportSignaturePermission");
    const helperEnd = text.indexOf("async function requirePastoralAction", helperStart);
    const helper = text.slice(helperStart, helperEnd);
    expect(helper).toContain('code: "FORBIDDEN"');
    expect(helper).toContain("Você não pode assinar este relatório com o papel solicitado.");
    const signStart = text.indexOf("signReport: protectedProcedure");
    const signEnd = text.indexOf("serviceTransactions: protectedProcedure", signStart);
    const signBlock = text.slice(signStart, signEnd);
    expect(signBlock.indexOf("requireTreasuryReportSignaturePermission")).toBeLessThan(signBlock.indexOf("signTreasuryReport"));
  });

  it("persiste usuário e Pessoa do contexto autenticado, não do input", () => {
    const text = source();
    const db = dbSource();
    expect(text).toContain("signedByChurchUserId: permission.access.actor.id");
    expect(text).toContain("signedByPersonId: permission.access.actor.personId ?? null");
    expect(db).toContain("signedByChurchUserId: data.signedByChurchUserId");
    expect(db).toContain("signedByPersonId: data.signedByPersonId");
  });

  it("protege a unicidade por igreja, relatório e papel", () => {
    const schemaText = schema();
    const migrationText = migration();
    expect(schemaText).toContain("treasury_report_signatures_church_report_role_unique");
    expect(migrationText).toContain("UNIQUE KEY `treasury_report_signatures_church_report_role_unique`");
    expect(source()).toContain('message: "Este papel já assinou este relatório."');
  });
});
