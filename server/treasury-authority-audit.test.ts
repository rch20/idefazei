import { readFileSync } from "node:fs";
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

const dbSource = compactSource(
  readFileSync(new URL("./db.ts", import.meta.url), "utf8")
);
const routerSource = compactSource(
  readFileSync(new URL("./routers.ts", import.meta.url), "utf8")
);
const schemaSource = compactSource(
  readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8")
);
const migrationSource = compactSource(
  readFileSync(
    new URL("../drizzle/0072_treasury_authority_audit.sql", import.meta.url),
    "utf8"
  )
);

describe("treasury structural authority audit", () => {
  it("expands the audit schema with tenant-scoped entity references and actions", () => {
    expect(schemaSource).toContain(
      compactSource('accountId: int("accountId")')
    );
    expect(schemaSource).toContain(
      compactSource('categoryId: int("categoryId")')
    );
    expect(schemaSource).toContain(
      compactSource('recurringScheduleId: int("recurringScheduleId")')
    );
    expect(schemaSource).toContain(
      compactSource('serviceId: int("serviceId")')
    );
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
      expect(schemaSource).toContain(compactSource(`"${action}"`));
      expect(migrationSource).toContain(compactSource(`'${action}'`));
    }
  });

  it("uses an additive migration with lookup indexes and no historical rewrite", () => {
    expect(migrationSource).toContain(
      compactSource("ADD COLUMN accountId INT NULL")
    );
    expect(migrationSource).toContain(
      compactSource("ADD COLUMN categoryId INT NULL")
    );
    expect(migrationSource).toContain(
      compactSource("ADD COLUMN recurringScheduleId INT NULL")
    );
    expect(migrationSource).toContain(
      compactSource("ADD COLUMN serviceId INT NULL")
    );
    expect(migrationSource).toContain(
      compactSource("financial_audit_logs_account_idx")
    );
    expect(migrationSource).toContain(
      compactSource("financial_audit_logs_service_idx")
    );
    expect(migrationSource).not.toMatch(/UPDATE\s+financial_audit_logs/i);
    expect(migrationSource).not.toMatch(
      /DELETE\s+FROM\s+financial_audit_logs/i
    );
  });

  it("propagates the authenticated actor from the router for every selected mutation", () => {
    expect(routerSource).toContain(
      compactSource(
        "createFinancialAccount({ ...input, actorChurchUserId: access.actor.id })"
      )
    );
    expect(routerSource).toContain(
      compactSource(
        "createFinancialCategory({ ...input, key, actorChurchUserId: access.actor.id })"
      )
    );
    expect(routerSource).toContain(
      compactSource(
        "updateFinancialCategory({ ...input, actorChurchUserId: access.actor.id })"
      )
    );
    expect(routerSource).toContain(
      compactSource(
        "setFinancialCategoryActive({ ...input, actorChurchUserId: access.actor.id })"
      )
    );
    expect(routerSource).toContain(
      compactSource(
        "updateTreasuryRecurringSchedule({ ...input, actorChurchUserId: access.actor.id })"
      )
    );
    expect(routerSource).toContain(
      compactSource(
        "setTreasuryRecurringScheduleActive({ ...input, actorChurchUserId: access.actor.id })"
      )
    );
    expect(routerSource).toContain(
      compactSource(
        "updateTreasuryService({ ...input, actorChurchUserId: access.actor.id })"
      )
    );
    expect(routerSource).toContain(
      compactSource(
        "cancelTreasuryService({ id: input.id, churchId: input.churchId, actorChurchUserId: access.actor.id })"
      )
    );
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
    expect(dbSource).toContain(compactSource("beforeData: before"));
    expect(dbSource).toContain(compactSource("afterData: after"));
    expect(dbSource).toContain(
      compactSource("return db.transaction(async (tx) => {")
    );
  });

  it("keeps account creation lookup tenant-aware and does not create duplicate activation logs", () => {
    expect(dbSource).toContain(
      compactSource("eq(financialAccounts.churchId, data.churchId)")
    );
    expect(dbSource).toContain(
      compactSource("if (before.active === data.active) return before;")
    );
    expect(dbSource).toContain(
      compactSource(
        'note: data.active ? "Programação ativada" : "Programação inativada"'
      )
    );
  });

  it("keeps system categories protected while auditing only authorized structural changes", () => {
    expect(routerSource).toContain(
      compactSource(
        'if (category.isSystem) throw new TRPCError({ code: "FORBIDDEN", message: "Categorias padrão do sistema não podem ser editadas." });'
      )
    );
    expect(routerSource).toContain(
      compactSource(
        'if (category.isSystem) throw new TRPCError({ code: "FORBIDDEN", message: "Categorias padrão do sistema não podem ser inativadas." });'
      )
    );
    expect(dbSource).toContain(
      compactSource("eq(financialCategories.isSystem, false)")
    );
  });
});
