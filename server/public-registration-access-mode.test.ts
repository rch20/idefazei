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

describe("Novas Almas — percepção dos cadastros pelo link", () => {
  const page = readFileSync("client/src/pages/GanharAlmas.tsx", "utf8");
  const db = readFileSync("server/db.ts", "utf8");
  it("usa a mesma marca gravada pela recepção", () => {
    const note = /SELF_REGISTERED_NOTE = "([^"]+)"/.exec(page)?.[1] ?? "";
    expect(note.length).toBeGreaterThan(10);
    expect(db).toContain(`notes: "${note}.",`);
  });
  it("mostra contador, selos e a ação de liberar acesso", () => {
    expect(page).toContain("aguardando primeiro contato e liberação de acesso");
    expect(page).toContain("Veio pelo link");
    expect(page).toContain("Login aguardando liberação");
    expect(page).toContain("Liberar acesso");
    expect(db).toContain("pendingAccountId");
  });
});
