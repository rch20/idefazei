import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const db = readFileSync("server/db.ts", "utf8");
const routers = readFileSync("server/routers.ts", "utf8");

describe("Tesouraria — estorno e datas", () => {
  it("estornar o pagamento reabre a conta a pagar vinculada", () => {
    const start = db.indexOf("export async function reverseFinancialTransaction");
    const body = db.slice(start, start + 4000);
    expect(body).toContain("financialPayables");
    expect(body).toContain('status: "aberta"');
    expect(body).toContain("financialTransactionId: null");
    expect(body).toContain("A conta a pagar vinculada foi reaberta.");
  });
  it("confirmação e estorno olham o dia civil do lançamento, sem deslocar por fuso", () => {
    expect(routers).not.toContain("new Date(existing.transactionDate).toISOString().slice(0, 10)");
    expect(routers).toContain("formatCivilDateValue(existing.transactionDate)");
  });
});

describe("Tesouraria — saldo inicial com data", () => {
  it("a migração 0104 é aditiva e consta no ledger com o hash correto", async () => {
    const { createHash } = await import("node:crypto");
    const sql = readFileSync("drizzle/0104_financial_account_opening_date.sql", "utf8");
    expect(sql).toMatch(/ADD COLUMN `openingBalanceDate` date NULL/);
    expect(sql).not.toMatch(/IF NOT EXISTS|DROP|DELETE/i);
    const ledger = JSON.parse(readFileSync("drizzle/custom-migrations.json", "utf8"));
    const entry = ledger.entries.find((item: { id: string }) => item.id === "0104");
    expect(entry.sha256).toBe(createHash("sha256").update(sql).digest("hex"));
  });
  it("painel e conciliação usam a mesma regra de saldo inicial", () => {
    expect(db).toContain("function financialAccountOpeningSeed");
    expect(db).not.toContain("formatCivilDateValue(account.createdAt) <=");
    expect(db).toContain("return financialAccountOpeningSeed(account, data.endDate) + movement;");
    expect(db).toContain("newAccountOpeningCents");
  });
});

describe("Tesouraria — painéis do acesso rápido", () => {
  it("todo cartão que abre painel carregável está registrado para renderizar", () => {
    const page = readFileSync("client/src/pages/Tesouraria.tsx", "utf8");
    const host = readFileSync("client/src/components/TreasuryQuickActionHost.tsx", "utf8");
    const lazyList = /const LAZY_QUICK_ACTIONS[^=]*= \[([\s\S]*?)\];/.exec(page)?.[1] ?? "";
    const loaders = Array.from(host.matchAll(/^  "([a-z-]+)": async \(\) => \{/gm)).map(match => match[1]);
    expect(loaders).toContain("doacoes-publicas");
    for (const action of loaders) expect(lazyList).toContain(`"${action}"`);
  });
});

describe("Tesouraria — recibo com data e hora para conferência bancária", () => {
  it("o servidor devolve quando o doador enviou o comprovante e a tela/PDF mostram data e hora", () => {
    const page = readFileSync("client/src/pages/Tesouraria.tsx", "utf8");
    const lib = readFileSync("client/src/lib/treasury.ts", "utf8");
    expect(db).toContain("publicDonationSubmissions.financialTransactionId, transactionId");
    expect(db).toContain('via: "pagina_publica" as const');
    expect(page).toContain("Comprovante enviado em");
    expect(page).toContain("Lançado na Tesouraria em");
    expect(lib).toContain("Comprovante enviado em");
    expect(lib).toContain("export function formatDateTimePtBr");
  });
});
