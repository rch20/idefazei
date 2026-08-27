import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const portalSource = readFileSync(resolve(process.cwd(), "client/src/pages/PortalVisitante.tsx"), "utf8");

describe("PortalVisitante", () => {
  it("mantém uma rota explícita para a Home no cabeçalho e no estado de sucesso", () => {
    expect(portalSource).toContain('href="/"');
    expect(portalSource).toContain("Voltar para a página inicial");
    expect(portalSource).toContain("onClick={() => setSubmitted(false)}");
  });

  it("usa o logo público do tenant com fallback seguro e trata falha de carregamento", () => {
    expect(portalSource).toContain("tenantPublic.data?.theme?.logoUrl, tenantPublic.data?.church.logoUrl");
    expect(portalSource).toContain("onError={() => setLogoSourceIndex");
    expect(portalSource).toContain("Portal do Visitante");
  });
});
