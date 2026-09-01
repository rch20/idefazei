import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const pageSource = readFileSync(resolve(root, "client/src/pages/Celulas.tsx"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const migrationSource = readFileSync(resolve(root, "drizzle/0056_cell_address_cep.sql"), "utf8");

describe("Cadastro de Células com endereço por CEP", () => {
  it("oferece busca por CEP e mantém preenchimento manual como fallback", () => {
    expect(pageSource).toContain("https://viacep.com.br/ws/");
    expect(pageSource).toContain('id="cell-zip-code"');
    expect(pageSource).toContain("Consultando endereço...");
    expect(pageSource).toContain("Endereço encontrado");
    expect(pageSource).toContain("preencha o endereço manualmente");
    expect(pageSource).toContain('id="cell-address-number"');
    expect(pageSource).toContain('id="cell-address-complement"');
    expect(pageSource).toContain('id="cell-state"');
  });

  it("persiste o endereço estruturado no mesmo modelo de Célula", () => {
    expect(schemaSource).toContain('addressNumber: varchar("addressNumber", { length: 20 })');
    expect(schemaSource).toContain('addressComplement: varchar("addressComplement", { length: 120 })');
    expect(schemaSource).toContain('zipCode: varchar("zipCode", { length: 9 })');
    expect(schemaSource).toContain('state: varchar("state", { length: 2 })');
    expect(routerSource).toContain("addressNumber: z.string().trim().max(20).optional()");
    expect(routerSource).toContain("zipCode: z.string().trim().regex");
    expect(routerSource).toContain("Informe um CEP válido com 8 números.");
    expect(routerSource).toContain("zipCode: input.zipCode?.replace(/\\D/g, \"\") || null");
    expect(routerSource).toContain("Toda liderança deve pertencer a esta igreja.");
  });

  it("usa migration nullable para preservar Células existentes", () => {
    expect(migrationSource).toContain("ALTER TABLE `cells` ADD `addressNumber` varchar(20);");
    expect(migrationSource).toContain("ALTER TABLE `cells` ADD `addressComplement` varchar(120);");
    expect(migrationSource).toContain("ALTER TABLE `cells` ADD `zipCode` varchar(9);");
    expect(migrationSource).toContain("ALTER TABLE `cells` ADD `state` varchar(2);");
    expect(migrationSource).not.toContain("NOT NULL");
  });
});
