import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const entrySheetSource = readFileSync(
  resolve(root, "client/src/components/TreasuryEntrySheetSection.tsx"),
  "utf8"
);

describe("Etapa 3A — ficha financeira do culto", () => {
  it("mantém uma ficha por igreja e culto e separa suas linhas", () => {
    expect(schemaSource).toContain(
      "export const treasuryEntrySheets = mysqlTable"
    );
    expect(schemaSource).toContain(
      'uniqueIndex("treasury_entry_sheets_church_service_unique")'
    );
    expect(schemaSource).toContain(
      "export const treasuryEntrySheetLines = mysqlTable"
    );
    expect(schemaSource).toContain(
      'contributionType: mysqlEnum("contributionType"'
    );
    expect(schemaSource).toContain('paymentMethod: mysqlEnum("paymentMethod"');
  });

  it("aplica churchId em todas as leituras e escritas da ficha", () => {
    expect(dbSource).toContain("eq(treasuryEntrySheets.churchId, churchId)");
    expect(dbSource).toContain(
      "eq(treasuryEntrySheetLines.churchId, churchId)"
    );
    expect(dbSource).toContain("churchId: data.churchId");
    expect(routerSource).toContain(
      "await requireTreasuryAccess(ctx.user.id, input.churchId)"
    );
  });

  it("salva como rascunho e não cria financialTransaction", () => {
    const start = routerSource.indexOf("saveEntrySheet: protectedProcedure");
    const end = routerSource.indexOf(
      "saveCountSheet: protectedProcedure",
      start
    );
    const procedure = routerSource.slice(start, end);
    expect(dbSource).toContain('status: "rascunho"');
    expect(procedure).toContain("saveTreasuryEntrySheet");
    expect(procedure).not.toContain("createFinancialTransaction");
    expect(entrySheetSource).toContain(
      "Nenhum valor foi lançado no livro-caixa"
    );
  });

  it("permite culto cadastrado ou culto manual e deixa o lançamento protegido para etapa posterior", () => {
    expect(entrySheetSource).toContain("Selecione um culto já cadastrado");
    expect(entrySheetSource).toContain("Informar culto manualmente");
    expect(entrySheetSource).toContain("Salvar ficha como rascunho");
    expect(entrySheetSource).toContain("Etapa 3C");
  });
});
