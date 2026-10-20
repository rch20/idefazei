import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routers = readFileSync("server/routers.ts", "utf8");
const section = readFileSync("client/src/components/PersonDetailsSection.tsx", "utf8");
const pessoas = readFileSync("client/src/pages/Pessoas.tsx", "utf8");

describe("ficha da pessoa — aba Dados", () => {
  it("restringe a edição a quem administra a igreja", () => {
    const start = routers.indexOf("updateDetails:");
    expect(start).toBeGreaterThan(-1);
    const body = routers.slice(start, start + 4000);
    expect(body).toContain("requireChurchAdministrator");
    expect(body).toContain("updatePersonContact");
  });
  it("expõe a aba Dados com edição condicionada", () => {
    expect(pessoas).toContain('value: "dados"');
    expect(pessoas).toContain("canEditPersonDetails");
    expect(section).toContain("trpc.people.updateDetails");
    expect(section).not.toMatch(/cpf|rg\b/i);
  });
});
