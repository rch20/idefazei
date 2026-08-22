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

  it("mantém os cartões de Eventos em uma grade segura e empilhada no mobile", () => {
    expect(css).toContain(".tenant-public-events-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));");
    expect(css).toContain(".tenant-public-contact-grid, .tenant-public-events-grid, .tenant-public-ministries-grid, .tenant-public-services-grid { grid-template-columns: 1fr; }");
    expect(css).toContain(".tenant-public-event-card { min-width: 0;");
  });

  it("mantém os cartões de Ministérios em uma grade segura e empilhada no mobile", () => {
    expect(css).toContain(".tenant-public-ministries-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));");
    expect(css).toContain(".tenant-public-ministry-card { display: flex; min-width: 0;");
    expect(css).toContain(".tenant-public-contact-grid, .tenant-public-events-grid, .tenant-public-ministries-grid, .tenant-public-services-grid { grid-template-columns: 1fr; }");
  });

  it("mantém horários em cartões estáveis sem expansão horizontal", () => {
    expect(css).toContain(".tenant-public-services-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));");
    expect(css).toContain(".tenant-public-service-card { display: flex; min-width: 0;");
    expect(css).toContain(".tenant-public-contact-grid, .tenant-public-events-grid, .tenant-public-ministries-grid, .tenant-public-services-grid { grid-template-columns: 1fr; }");
  });
});
