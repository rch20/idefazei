import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("LoginIgreja", () => {
  it("mantém o cadastro comercial fora do login de subdomínios de igreja", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/LoginIgreja.tsx"), "utf8");
    expect(source).toContain("const { isChurchSubdomain } = useTenant()");
    expect(source).toContain("{!isChurchSubdomain && (");
    expect(source).toContain('href="/cadastro-igreja"');
  });
});
