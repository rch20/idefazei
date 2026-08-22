import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("LoginIgreja", () => {
  it("limita o cadastro comercial aos hosts institucionais da Ide Fazei", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/LoginIgreja.tsx"), "utf8");
    expect(source).toContain('hostname === "idefazei.com.br" || hostname === "www.idefazei.com.br"');
    expect(source).toContain("{isCommercialDomain && (");
    expect(source).toContain('href="/cadastro-igreja"');
  });
});
