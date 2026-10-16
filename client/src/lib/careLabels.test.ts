import { describe, expect, it } from "vitest";
import { getCareRoleLabel } from "./careLabels";

describe("rótulos de responsabilidade de cuidado", () => {
  it("distingue o discipulador principal do apoio de Consolidação", () => {
    expect(getCareRoleLabel("discipulador")).toBe("Discipulador principal");
    expect(getCareRoleLabel("consolidador")).toBe("Consolidador da Consolidação");
  });

  it("mantém um fallback legível para papéis antigos ou desconhecidos", () => {
    expect(getCareRoleLabel("lider_celula")).toBe("Líder de Célula");
    expect(getCareRoleLabel("papel_legado")).toBe("papel legado");
    expect(getCareRoleLabel(null)).toBe("Papel não informado");
  });
});
