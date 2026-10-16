import { describe, expect, it } from "vitest";
import { createFoundationTheme } from "./FoundationTheme";

describe("createFoundationTheme", () => {
  it("usa as cores padrão quando a configuração da igreja está ausente ou inválida", () => {
    const theme = createFoundationTheme("not-a-color", null);

    expect(theme.primary).toBe("#1e3a5f");
    expect(theme.accent).toBe("#c9a84c");
    expect(theme.primarySoft).not.toContain("color-mix");
    expect(theme.accentSoft).not.toContain("color-mix");
  });

  it("normaliza cores hexadecimais curtas e mantém o tema determinístico", () => {
    const first = createFoundationTheme("#abc", "#123456");
    const second = createFoundationTheme("#abc", "#123456");

    expect(first).toEqual(second);
    expect(first.primary).toBe("#aabbcc");
    expect(first.accent).toBe("#123456");
  });

  it("escolhe texto claro ou escuro conforme o contraste da cor da igreja", () => {
    const darkTheme = createFoundationTheme("#102a43", "#c9a84c");
    const lightTheme = createFoundationTheme("#f5f5f5", "#ffffff");

    expect(darkTheme.primaryForeground).toBe("#ffffff");
    expect(lightTheme.primaryForeground).toBe("#172033");
    expect(lightTheme.accentForeground).toBe("#172033");
  });
});
