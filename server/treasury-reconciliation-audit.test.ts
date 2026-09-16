import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const db = () => read("server/db.ts");
const router = () => read("server/routers.ts");
const schema = () => read("drizzle/schema.ts");
const migration = () => read("drizzle/0071_financial_reconciliation_audit.sql");

describe("auditoria de conciliações e comprovantes", () => {
  it("adiciona referências tenant-aware de conciliação e comprovante ao log financeiro", () => {
    const text = schema();
    expect(text).toContain('reconciliationId: int("reconciliationId")');
    expect(text).toContain('attachmentId: int("attachmentId")');
    expect(text).toContain('"reconciliacao_criada"');
    expect(text).toContain('"reconciliacao_atualizada"');
    expect(text).toContain('"comprovante_adicionado"');
    expect(text).toContain('"comprovante_desvinculado"');
  });

  it("mantém a migration aditiva e indexa consultas de auditoria por tenant", () => {
    const text = migration();
    expect(text).toContain("ADD COLUMN `reconciliationId` int NULL");
    expect(text).toContain("ADD COLUMN `attachmentId` int NULL");
    expect(text).toContain("financial_audit_logs_church_reconciliation_idx");
    expect(text).toContain("financial_audit_logs_church_attachment_idx");
    expect(text).toContain("reconciliacao_criada");
    expect(text).toContain("comprovante_desvinculado");
  });

  it("salva a conciliação e seu before/after na mesma transação", () => {
    const text = db();
    const start = text.indexOf("export async function saveFinancialReconciliation");
    const end = text.indexOf("export async function closeFinancialPeriod", start);
    const block = text.slice(start, end);
    expect(block).toContain("return db.transaction(async (tx) =>");
    expect(block).toContain('.for("update")');
    expect(block).toContain('action: existing ? "reconciliacao_atualizada" : "reconciliacao_criada"');
    expect(block).toContain("beforeData: existing ?? undefined");
    expect(block).toContain("afterData: reconciliation");
    expect(block).toContain("reconciliationId: reconciliation.id");
  });

  it("audita adição e desvinculação de comprovantes com o ator autenticado", () => {
    const text = db();
    const createStart = text.indexOf("export async function createFinancialReconciliationAttachment");
    const removeStart = text.indexOf("export async function removeFinancialReconciliationAttachment");
    const end = text.indexOf("export async function getBookBalanceAt", removeStart);
    const createBlock = text.slice(createStart, removeStart);
    const removeBlock = text.slice(removeStart, end);
    expect(createBlock).toContain("return db.transaction(async (tx) =>");
    expect(createBlock).toContain('action: "comprovante_adicionado"');
    expect(createBlock).toContain("actorChurchUserId: data.uploadedByChurchUserId");
    expect(createBlock).toContain("afterData: attachment");
    expect(removeBlock).toContain("actorChurchUserId: number");
    expect(removeBlock).toContain('.for("update")');
    expect(removeBlock).toContain('action: "comprovante_desvinculado"');
    expect(removeBlock).toContain("beforeData: attachment");
  });

  it("passa o ator do contexto ao desvincular o comprovante", () => {
    const text = router();
    const start = text.indexOf("removeReconciliationAttachment: protectedProcedure");
    const end = text.indexOf("saveReconciliation: protectedProcedure", start);
    const block = text.slice(start, end);
    expect(block).toContain("const access = await requireTreasuryAccess(ctx.user.id, input.churchId)");
    expect(block).toContain("actorChurchUserId: access.actor.id");
    expect(block).toContain("churchId: input.churchId");
  });
});
