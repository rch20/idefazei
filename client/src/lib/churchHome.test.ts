import { describe, expect, it } from "vitest";
import { getChurchHomePath } from "./churchHome";

describe("getChurchHomePath", () => {
  it("leva perfis executivos para a Visão geral", () => {
    expect(getChurchHomePath({ actorRole: "pastor_presidente", roles: ["pastor_presidente"], isExecutive: true })).toBe("/app/dashboard");
    expect(getChurchHomePath({ actorRole: "secretario", roles: ["secretario"], isExecutive: true })).toBe("/app/dashboard");
  });

  it("leva líderes e supervisores para Células", () => {
    expect(getChurchHomePath({ actorRole: "lider", roles: ["lider"], canManageCells: true })).toBe("/app/celulas");
    expect(getChurchHomePath({ actorRole: "membro", roles: ["membro", "supervisor"], canManageCells: true })).toBe("/app/celulas");
  });

  it("leva consolidadores e visitadores para Consolidação", () => {
    expect(getChurchHomePath({ actorRole: "consolidador", roles: ["consolidador"], isConsolidator: true, canAccessVisits: true })).toBe("/app/consolidacao");
    expect(getChurchHomePath({ actorRole: "membro", roles: ["membro", "visitador"], canAccessVisits: true })).toBe("/app/consolidacao");
  });

  it("leva tesoureiros e líderes de ministério para suas áreas", () => {
    expect(getChurchHomePath({ actorRole: "tesoureiro", roles: ["tesoureiro"], canAccessTreasury: true })).toBe("/app/tesouraria");
    expect(getChurchHomePath({ actorRole: "membro", roles: ["membro"], canManageMinistry: true })).toBe("/app/ministerios");
  });

  it("mantém o membro sem função adicional na Área do Membro", () => {
    expect(getChurchHomePath({ actorRole: "membro", roles: ["membro"] })).toBe("/app/membro");
    expect(getChurchHomePath(null)).toBe("/app/membro");
  });
});
