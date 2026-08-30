import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const pageSource = readFileSync(resolve(root, "client/src/pages/Tesouraria.tsx"), "utf8");
const sectionSource = readFileSync(resolve(root, "client/src/components/TreasuryServiceSection.tsx"), "utf8");
const treasurySource = readFileSync(resolve(root, "client/src/lib/treasury.ts"), "utf8");

describe("Fluxo estrutural de prestação por culto", () => {
  it("mantém entidades de culto, contagem, depósito e relatório no schema", () => {
    expect(schemaSource).toContain('export const treasuryServices = mysqlTable');
    expect(schemaSource).toContain('export const treasuryCountSheets = mysqlTable');
    expect(schemaSource).toContain('export const treasuryDeposits = mysqlTable');
    expect(schemaSource).toContain('export const treasuryReports = mysqlTable');
    expect(schemaSource).toContain("serviceId: int(\"serviceId\")");
    expect(schemaSource).toContain("countSheetId: int(\"countSheetId\")");
  });

  it("preserva isolamento por igreja e dupla conferência", () => {
    expect(dbSource).toContain("eq(treasuryServices.churchId, churchId)");
    expect(dbSource).toContain("counterOnePersonId");
    expect(dbSource).toContain("counterTwoPersonId");
    expect(routerSource).toContain("Os dois contadores precisam pertencer a esta igreja.");
    expect(routerSource).toContain("A contagem precisa de duas pessoas diferentes.");
  });

  it("fecha a folha antes de emitir um snapshot histórico", () => {
    expect(dbSource).toContain("countSheet.status !== \"fechada\"");
    expect(dbSource).toContain("snapshot");
    expect(routerSource).toContain("Feche a folha de contagem e confira o vínculo com o culto antes de emitir o relatório.");
    expect(sectionSource).toContain("Emitir relatório");
  });

  it("oferece nome do culto, vínculo opcional do lançamento e impressão", () => {
    expect(sectionSource).toContain("Nome do culto");
    expect(pageSource).toContain("serviceId");
    expect(pageSource).toContain("countSheetId");
    expect(sectionSource).toContain("Reimprimir relatório");
    expect(sectionSource).toContain("Histórico de relatórios");
  });

  it("cria ocorrências recorrentes idempotentes e preserva exceções pontuais", () => {
    expect(schemaSource).toContain('export const treasuryRecurringSchedules = mysqlTable');
    expect(schemaSource).toContain('recurringScheduleId: int("recurringScheduleId")');
    expect(schemaSource).toContain('occurrenceOverride: boolean("occurrenceOverride")');
    expect(dbSource).toContain("materializeTreasuryRecurringOccurrences");
    expect(dbSource).toContain("treasuryRecurringSchedules.weekday");
    expect(routerSource).toContain("createRecurringSchedule");
    expect(routerSource).toContain("setRecurringScheduleActive");
    expect(sectionSource).toContain("Programação fixa");
    expect(sectionSource).toContain("Culto regular");
    expect(sectionSource).toContain("Não realizado");
  });

  it("mantém o histórico reimprimível e não cria uma segunda tesouraria", () => {
    expect(sectionSource).toContain("reportsQuery");
    expect(sectionSource).toContain("printReport(report)");
    expect(pageSource).toContain("TreasuryServiceSection");
    expect(dbSource).toContain("getTreasuryReportsByChurch");
  });

  it("aceita horários válidos no padrão HH:mm", () => {
    expect(routerSource).toContain("startTime: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/");
    expect(sectionSource).toContain('type="time"');
  });

  it("preserva a data de calendário e compacta ações no mobile", () => {
    expect(treasurySource).toContain("value.getUTCFullYear()");
    expect(treasurySource).toContain("value.getUTCMonth()");
    expect(treasurySource).toContain("value.getUTCDate()");
    expect(sectionSource).toContain("Abrir ações");
    expect(sectionSource).toContain("hidden sm:flex");
  });
});
