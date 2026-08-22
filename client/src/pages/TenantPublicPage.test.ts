import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Template Ministerial Base — estabilidade global", () => {
  const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

  it("protege a raiz pública contra expansão horizontal e mídias fora do viewport", () => {
    expect(css).toContain(".tenant-public-root {");
    expect(css).toContain("max-width: 100%;");
    expect(css).toContain("overflow-x: clip;");
    expect(css).toContain(".tenant-public-root img,");
    expect(css).toContain(".tenant-public-root video,");
    expect(css).toContain(".tenant-public-root iframe,");
  });

  it("não introduz 100vw na camada pública de tenant", () => {
    const tenantLayer = css.slice(css.indexOf("TEMPLATE MINISTERIAL BASE"));
    expect(tenantLayer).not.toMatch(/100vw/);
  });

  it("respeita redução de movimento no shell público", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".tenant-public-root *");
  });
});
