import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schemaSource = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
const migrationPath = new URL("../drizzle/0084_online_contributions.sql", import.meta.url);
const migrationSource = readFileSync(migrationPath, "utf8");
const ledgerSource = readFileSync(new URL("../drizzle/custom-migrations.json", import.meta.url), "utf8");
const ledger = JSON.parse(ledgerSource) as {
  entries: Array<{ id: string; file: string; kind: string; sha256: string }>;
};

describe("modelo de contribuição online e configuração PIX", () => {
  it("declara uma configuração PIX única e tenant-aware", () => {
    expect(schemaSource).toContain('export const treasuryPixSettings = mysqlTable');
    expect(schemaSource).toContain('churchId: int("churchId").notNull()');
    expect(schemaSource).toContain('uniqueIndex("treasury_pix_settings_church_unique").on(table.churchId)');
    expect(schemaSource).toContain('pixKeyType: mysqlEnum("pixKeyType", ["cpf", "cnpj", "email", "telefone", "aleatoria", "outro"])');
    expect(schemaSource).toContain('active: boolean("active").default(true).notNull()');
    expect(schemaSource).toContain('updatedByChurchUserId: int("updatedByChurchUserId").notNull()');
  });

  it("preserva o snapshot da chave PIX usada no envio", () => {
    expect(schemaSource).toContain('pixSettingsId: int("pixSettingsId").notNull()');
    expect(schemaSource).toContain('pixKeySnapshot: varchar("pixKeySnapshot", { length: 255 }).notNull()');
    expect(schemaSource).toContain('pixKeyTypeSnapshot: mysqlEnum("pixKeyTypeSnapshot", ["cpf", "cnpj", "email", "telefone", "aleatoria", "outro"])');
    expect(schemaSource).toContain('pixRecipientNameSnapshot: varchar("pixRecipientNameSnapshot", { length: 255 }).notNull()');
  });

  it("mantém a contribuição como fila até a aprovação financeira", () => {
    expect(schemaSource).toContain('export const onlineContributions = mysqlTable');
    expect(schemaSource).toContain('status: mysqlEnum("status", ["pendente", "aprovada", "recusada"]).default("pendente").notNull()');
    expect(schemaSource).toContain('confirmedAmountCents: int("confirmedAmountCents")');
    expect(schemaSource).toContain('financialTransactionId: int("financialTransactionId")');
    expect(schemaSource).toContain('uniqueIndex("online_contributions_church_transaction_unique").on(');
    expect(schemaSource).toContain('rejectionReason: text("rejectionReason")');
  });

  it("protege reenvio, comprovante e isolamento de tenant por índices", () => {
    for (const marker of [
      "online_contributions_church_submitter_idempotency_unique",
      "online_contributions_church_status_submitted_idx",
      "online_contributions_church_person_submitted_idx",
      "online_contributions_church_proof_sha256_idx",
      'proofFileKey: varchar("proofFileKey", { length: 512 }).notNull()',
      'proofSha256: varchar("proofSha256", { length: 64 }).notNull()',
    ]) {
      expect(schemaSource).toContain(marker);
    }
  });
});

describe("migration 0084 de contribuição online", () => {
  it("cria as duas tabelas de forma aditiva", () => {
    expect(migrationSource).toContain("CREATE TABLE IF NOT EXISTS treasury_pix_settings");
    expect(migrationSource).toContain("CREATE TABLE IF NOT EXISTS online_contributions");
    expect(migrationSource).toContain("ENGINE=InnoDB");
    expect(migrationSource).not.toMatch(/^\s*UPDATE\s+/im);
    expect(migrationSource).not.toMatch(/^\s*DELETE\s+FROM/im);
    expect(migrationSource).not.toMatch(/^\s*DROP\s+(TABLE|COLUMN|INDEX)/im);
  });

  it("altera a auditoria financeira com referências e ciclo completo", () => {
    expect(migrationSource).toContain("ADD COLUMN pixSettingsId INT NULL");
    expect(migrationSource).toContain("ADD COLUMN onlineContributionId INT NULL");
    expect(migrationSource).toContain("financial_audit_logs_pix_settings_idx");
    expect(migrationSource).toContain("financial_audit_logs_online_contribution_idx");
    for (const action of [
      "pix_configurada",
      "pix_atualizada",
      "pix_ativada",
      "pix_desativada",
      "contribuicao_enviada",
      "contribuicao_atualizada",
      "contribuicao_aprovada",
      "contribuicao_recusada",
    ]) {
      expect(migrationSource).toContain(`'${action}'`);
      expect(schemaSource).toContain(`"${action}"`);
    }
  });

  it("está registrada no ledger com checksum verificável", () => {
    const entry = ledger.entries.find((candidate) => candidate.id === "0084");
    expect(entry).toMatchObject({
      file: "drizzle/0084_online_contributions.sql",
      kind: "custom-additive",
    });
    const checksum = createHash("sha256").update(migrationSource).digest("hex");
    expect(entry?.sha256).toBe(checksum);
  });
});
