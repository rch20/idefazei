import { describe, expect, it } from "vitest";
import { getChurchHomePath } from "./churchHome";

describe("getChurchHomePath", () => {
  it("leva perfis executivos e operacionais para a mesma Home global", () => {
    expect(getChurchHomePath({ actorRole: "pastor_presidente", roles: ["pastor_presidente"], isExecutive: true })).toBe("/app/inicio");
    expect(getChurchHomePath({ actorRole: "lider", roles: ["lider"], canManageCells: true })).toBe("/app/inicio");
    expect(getChurchHomePath({ actorRole: "consolidador", roles: ["consolidador"], isConsolidator: true })).toBe("/app/inicio");
    expect(getChurchHomePath({ actorRole: "tesoureiro", roles: ["tesoureiro"], canAccessTreasury: true })).toBe("/app/inicio");
  });

  it("mantém o membro sem função adicional na mesma Home global", () => {
    expect(getChurchHomePath({ actorRole: "membro", roles: ["membro"] })).toBe("/app/inicio");
    expect(getChurchHomePath(null)).toBe("/app/inicio");
  });
});
