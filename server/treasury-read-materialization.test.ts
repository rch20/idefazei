import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Tesouraria: leitura sem materialização oculta", () => {
  const root = resolve(__dirname, "..");
  const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
  const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
  const pageSource = readFileSync(resolve(root, "client/src/pages/Tesouraria.tsx"), "utf8");
  const sectionSource = readFileSync(resolve(root, "client/src/components/TreasuryServiceSection.tsx"), "utf8");

  const functionBody = (source: string, signature: string, nextSignature: string) => {
    const start = source.indexOf(signature);
    const end = source.indexOf(nextSignature, start + signature.length);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    return source.slice(start, end);
  };

  it("mantém contas e categorias como consultas puras", () => {
    expect(functionBody(dbSource, "export async function getFinancialAccountsByChurch", "export async function createFinancialAccount")).not.toContain("ensureTreasuryDefaults");
    expect(functionBody(dbSource, "export async function getFinancialCategoriesByChurch", "export async function createFinancialCategory")).not.toContain("ensureTreasuryDefaults");
    expect(functionBody(dbSource, "export async function getFinancialCategoriesForManagement", "export async function getFinancialCategoryForManagement")).not.toContain("ensureTreasuryDefaults");
  });

  it("expõe a inicialização padrão como mutação autorizada", () => {
    expect(routerSource).toContain("initializeDefaults: protectedProcedure");
    expect(routerSource).toContain("Somente Pastores podem inicializar a estrutura padrão da Tesouraria.");
    expect(pageSource).toContain("initializeDefaults.mutate");
    expect(pageSource).toContain("Inicializar padrões");
  });

  it("mantém a lista de serviços pura e materializa ocorrências por ação explícita", () => {
    expect(functionBody(dbSource, "export async function getTreasuryServices", "export async function getTreasuryRecurringSchedules")).not.toContain("materializeTreasuryRecurringOccurrences");
    expect(routerSource).toContain("materializeOccurrences: protectedProcedure");
    expect(routerSource).toContain("Somente Pastores podem materializar ocorrências recorrentes.");
    expect(sectionSource).toContain("materializeOccurrences.mutate");
    expect(sectionSource).toContain("Atualizar ocorrências");
  });
});

describe("Tesouraria: seeds continuam disponíveis no backend", () => {
  const dbSource = readFileSync(resolve(__dirname, "db.ts"), "utf8");

  it("retorna contadores da inicialização sem alterar históricos", () => {
    expect(dbSource).toContain("export async function ensureTreasuryDefaults");
    expect(dbSource).toContain("accountsCreated");
    expect(dbSource).toContain("categoriesCreated");
    expect(dbSource).toContain("return { accountsCreated, categoriesCreated }");
  });
});

export {};
