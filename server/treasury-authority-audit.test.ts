import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const schemaSource = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
const migrationSource = readFileSync(new URL("../drizzle/0072_treasury_authority_audit.sql", import.meta.url), "utf8");

describe("treasury structural authority audit", () => {
  it("expands the audit schema with tenant-scoped entity references and actions", () => {
    expect(schemaSource).toContain('accountId: int("accountId")');
    expect(schemaSource).toContain('categoryId: int("categoryId")');
    expect(schemaSource).toContain('recurringScheduleId: int("recurringScheduleId")');
    expect(schemaSource).toContain('serviceId: int("serviceId")');
    for (const action of [
      "conta_criada",
      "categoria_criada",
      "categoria_atualizada",
      "categoria_ativada",
      "programacao_criada",
      "programacao_atualizada",
      "programacao_ativada",
      "servico_criado",
      "servico_atualizado",
      "servico_cancelado",
    ]) {
      expect(schemaSource).toContain(`"${action}"`);
      expect(migrationSource).toContain(`'${action}'`);
    }
  });

  it("uses an additive migration with lookup indexes and no historical rewrite", () => {
    expect(migrationSource).toContain("ADD COLUMN accountId INT NULL");
    expect(migrationSource).toContain("ADD COLUMN categoryId INT NULL");
    expect(migrationSource).toContain("ADD COLUMN recurringScheduleId INT NULL");
    expect(migrationSource).toContain("ADD COLUMN serviceId INT NULL");
    expect(migrationSource).toContain("financial_audit_logs_account_idx");
    expect(migrationSource).toContain("financial_audit_logs_service_idx");
    expect(migrationSource).not.toMatch(/UPDATE\s+financial_audit_logs/i);
    expect(migrationSource).not.toMatch(/DELETE\s+FROM\s+financial_audit_logs/i);
  });

  it("propagates the authenticated actor from the router for every selected mutation", () => {
    expect(routerSource).toContain("createFinancialAccount({ ...input, actorChurchUserId: access.actor.id })");
    expect(routerSource).toContain("createFinancialCategory({ ...input, key, actorChurchUserId: access.actor.id })");
    expect(routerSource).toContain("updateFinancialCategory({ ...input, actorChurchUserId: access.actor.id })");
    expect(routerSource).toContain("setFinancialCategoryActive({ ...input, actorChurchUserId: access.actor.id })");
    expect(routerSource).toContain("updateTreasuryRecurringSchedule({ ...input, actorChurchUserId: access.actor.id })");
    expect(routerSource).toContain("setTreasuryRecurringScheduleActive({ ...input, actorChurchUserId: access.actor.id })");
    expect(routerSource).toContain("updateTreasuryService({ ...input, actorChurchUserId: access.actor.id })");
    expect(routerSource).toContain("cancelTreasuryService({ id: input.id, churchId: input.churchId, actorChurchUserId: access.actor.id })");
  });

  it("records creation and changes in the same transaction as the business write", () => {
    for (const marker of [
      'action: "conta_criada"',
      'action: "categoria_criada"',
      'action: "categoria_atualizada"',
      'action: "categoria_ativada"',
      'action: "programacao_criada"',
      'action: "programacao_atualizada"',
      'action: "programacao_ativada"',
      'action: "servico_criado"',
      'action: "servico_atualizado"',
      'action: "servico_cancelado"',
    ]) {
      expect(dbSource).toContain(marker);
    }
    expect(dbSource).toContain("beforeData: before");
    expect(dbSource).toContain("afterData: after");
    expect(dbSource).toContain("return db.transaction(async (tx) => {");
  });

  it("keeps account creation lookup tenant-aware and does not create duplicate activation logs", () => {
    expect(dbSource).toContain("eq(financialAccounts.churchId, data.churchId)");
    expect(dbSource).toContain("if (before.active === data.active) return before;");
    expect(dbSource).toContain("note: data.active ? \"Programação ativada\" : \"Programação inativada\"");
  });

  it("keeps system categories protected while auditing only authorized structural changes", () => {
    expect(routerSource).toContain("if (category.isSystem) throw new TRPCError({ code: \"FORBIDDEN\", message: \"Categorias padrão do sistema não podem ser editadas.\" });");
    expect(routerSource).toContain("if (category.isSystem) throw new TRPCError({ code: \"FORBIDDEN\", message: \"Categorias padrão do sistema não podem ser inativadas.\" });");
    expect(dbSource).toContain("eq(financialCategories.isSystem, false)");
  });
});
