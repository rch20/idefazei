import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const migrationSource = readFileSync(
  resolve(root, "drizzle/0092_treasury_entry_sheet_posting.sql"),
  "utf8"
);
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const historySource = readFileSync(
  resolve(root, "client/src/components/TreasuryEntrySheetHistorySection.tsx"),
  "utf8"
);
const documentSource = readFileSync(
  resolve(root, "client/src/lib/treasury.ts"),
  "utf8"
);
const entrySheetSource = readFileSync(
  resolve(root, "client/src/components/TreasuryEntrySheetSection.tsx"),
  "utf8"
);

function procedureBlock(name: string, nextName: string) {
  const start = routerSource.indexOf(`${name}: protectedProcedure`);
  const end = routerSource.indexOf(`${nextName}: protectedProcedure`, start);
  return routerSource.slice(start, end > start ? end : undefined);
}

describe("Etapa 3B/3C — histórico e lançamento protegido da ficha", () => {
  it("mantém estados de assinatura e lançamento na ficha e migration revisável", () => {
    expect(schemaSource).toContain('postingStatus: mysqlEnum("postingStatus"');
    expect(schemaSource).toContain('signedAt: timestamp("signedAt")');
    expect(schemaSource).toContain('postedAt: timestamp("postedAt")');
    expect(schemaSource).toContain(
      'financialTransactionId: int("financialTransactionId")'
    );
    expect(schemaSource).toContain(
      'uniqueIndex("treasury_entry_sheet_lines_church_transaction_unique")'
    );
    expect(migrationSource).toContain("ALTER TABLE treasury_entry_sheets");
    expect(migrationSource).toContain("ALTER TABLE treasury_entry_sheet_lines");
    expect(migrationSource).toContain(
      "treasury_entry_sheet_lines_church_transaction_unique"
    );
  });

  it("mantém o histórico filtrável por culto e data e gera documento novamente", () => {
    expect(routerSource).toContain("entrySheetHistory: protectedProcedure");
    expect(dbSource).toContain("getTreasuryEntrySheetHistoryByChurch");
    expect(dbSource).toContain("eq(treasuryServices.churchId, churchId)");
    expect(historySource).toContain("Buscar culto ou ficha");
    expect(historySource).toContain('type="date"');
    expect(historySource).toContain("getCivilDateKey");
    expect(historySource).toContain("entrySheetHistory.setData");
    expect(historySource).toContain("Imprimir / salvar PDF");
    expect(historySource).toContain("Compartilhar");
    expect(documentSource).toContain("buildTreasuryEntrySheetHtml");
    expect(documentSource).toContain("shareTreasuryEntrySheet");
    expect(documentSource).toContain("copyTreasuryEntrySheetText");
    expect(documentSource).toContain('return "copied"');
  });

  it("permite assinatura opcional, mas exige finalização antes dela", () => {
    const finalize = procedureBlock("finalizeEntrySheet", "signEntrySheet");
    const sign = procedureBlock("signEntrySheet", "postEntrySheet");
    expect(finalize).toContain("finalizeTreasuryEntrySheet");
    expect(sign).toContain("signTreasuryEntrySheet");
    expect(sign).toContain("Finalize a ficha antes de assiná-la");
    expect(historySource).toContain("Assinar ficha");
    expect(entrySheetSource).toContain("Assinar ficha");
    expect(entrySheetSource).toContain("Ficha salva com sucesso");
    expect(entrySheetSource).toContain("Imprimir / PDF");
    expect(entrySheetSource).toContain("Compartilhar");
    expect(entrySheetSource).toContain("Enviar por e-mail");
    expect(entrySheetSource).toContain("Enviar pelo WhatsApp");
    expect(entrySheetSource).toContain("buildTreasuryEntrySheetEmailUrl");
    expect(entrySheetSource).toContain("buildTreasuryEntrySheetWhatsAppUrl");
    expect(entrySheetSource).toContain("Escolha o destinatário e envie.");
    expect(entrySheetSource).not.toContain("postEntrySheet.mutate");
    expect(entrySheetSource).toContain("Assinar digitalmente");
    expect(entrySheetSource).toContain("A ficha será finalizada e protegida.");
    expect(entrySheetSource).toContain("setPostSaveActionsOpen(true)");
  });

  it("mantém o salvamento como rascunho e protege o lançamento contra duplicidade", () => {
    const save = procedureBlock("saveEntrySheet", "finalizeEntrySheet");
    const post = procedureBlock("postEntrySheet", "saveCountSheet");
    expect(save).toContain("saveTreasuryEntrySheet");
    expect(save).not.toContain("postTreasuryEntrySheet");
    expect(post).toContain("postTreasuryEntrySheet");
    expect(post).toContain("Já existe lançamento financeiro para este culto");
    expect(dbSource).toContain(
      'eq(treasuryEntrySheets.postingStatus, "nao_lancada")'
    );
    expect(dbSource).toContain("eq(financialAccounts.active, true)");
    expect(dbSource).toContain(
      "isNull(treasuryEntrySheetLines.financialTransactionId)"
    );
    expect(dbSource).toContain("reference: `ficha-culto:${sheet.id}`");
    expect(historySource).toContain(
      "Os valores desta ficha serão lançados no livro-caixa uma única vez"
    );
  });

  it("mantém todas as operações limitadas ao tenant atual", () => {
    expect(dbSource).toContain(
      "eq(treasuryEntrySheets.churchId, data.churchId)"
    );
    expect(dbSource).toContain(
      "eq(treasuryEntrySheetLines.churchId, data.churchId)"
    );
    expect(dbSource).toContain(
      "eq(financialTransactions.churchId, data.churchId)"
    );
    expect(routerSource).toContain(
      "await requireTreasuryAccess(ctx.user.id, input.churchId)"
    );
  });
});
