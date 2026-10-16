import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("Identidade da plataforma", () => {
  it("mantém a identidade oficial Ide Fazei no documento da aplicação", () => {
    expect(indexHtml).toContain("<title>Ide Fazei -");
    expect(indexHtml).toContain('content="Ide Fazei"');
  });
});
