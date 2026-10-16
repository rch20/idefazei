import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("useChurchAuth logout", () => {
  it("limpa a sessão e retorna ao caminho raiz do host atual", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/hooks/useChurchAuth.ts"), "utf8");

    expect(source).toContain("clearChurchSession();");
    expect(source).toContain("setUser(null);");
    expect(source).toContain('window.location.replace("/");');
  });
});
