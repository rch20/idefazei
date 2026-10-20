import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

describe("cadastro público — modo de liberação do login", () => {
  it("a migração 0103 é aditiva e está no ledger com o hash correto", () => {
    const sql = readFileSync("drizzle/0103_public_registration_access_mode.sql", "utf8");
    expect(sql).toMatch(/ADD COLUMN `publicRegistrationAccessMode` enum\('manual','automatico'\) NOT NULL DEFAULT 'manual'/);
    expect(sql).not.toMatch(/IF NOT EXISTS|DROP|DELETE/i);
    const ledger = JSON.parse(readFileSync("drizzle/custom-migrations.json", "utf8"));
    const entry = ledger.entries.find((item: { id: string }) => item.id === "0103");
    expect(entry.sha256).toBe(createHash("sha256").update(sql).digest("hex"));
  });
  it("Configurações permite escolher o modo e descreve o que acontece", () => {
    const source = readFileSync("client/src/pages/Configuracoes.tsx", "utf8");
    expect(source).toContain("Como liberar o login de quem se cadastra");
    expect(source).toContain("Aprovar manualmente (recomendado)");
    expect(source).not.toContain("nenhuma conta de acesso é criada automaticamente");
  });
  it("a ficha oferece liberar o acesso pendente", () => {
    const source = readFileSync("client/src/pages/Pessoas.tsx", "utf8");
    expect(source).toContain("Cadastro aguardando liberação");
    expect(source).toContain("pendingAccountId");
  });
});
