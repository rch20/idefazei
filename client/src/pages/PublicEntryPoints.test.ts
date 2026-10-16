import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pagesRoot = resolve(process.cwd(), "client/src/pages");

describe("entry points públicos", () => {
  it("não expõe ações fantasma nem contatos de teste", () => {
    const landing = readFileSync(resolve(pagesRoot, "LandingPage.tsx"), "utf8");

    expect(landing).not.toContain('href="#"');
    expect(landing).not.toContain("5511999999999");
    expect(landing).toContain('href="/contato"');
  });

  it("leva o botão Ver Demo para a demonstração pública", () => {
    const landing = readFileSync(resolve(pagesRoot, "LandingPage.tsx"), "utf8");

    expect(landing).toContain('href="/demo"');
    expect(landing).not.toContain('href="/app/dashboard"');
  });

  it("mantém a Home antiga como alias da landing pública oficial", () => {
    const home = readFileSync(resolve(pagesRoot, "Home.tsx"), "utf8");

    expect(home).toContain('export { default } from "./LandingPage";');
    expect(home).not.toContain("getLoginUrl");
  });
});
