import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { absolutizeUrl, getTenantSlugFromHost, injectTenantMeta, renderTenantMetaTags } from "./tenantPublicMeta";

describe("meta pública por tenant", () => {
  it("resolve o slug do tenant a partir do Host, ignorando raiz/app", () => {
    expect(getTenantSlugFromHost("minhaigreja.idefazei.com.br")).toBe("minhaigreja");
    expect(getTenantSlugFromHost("minhaigreja.idefazei.com.br:443")).toBe("minhaigreja");
    expect(getTenantSlugFromHost("idefazei.com.br")).toBeNull();
    expect(getTenantSlugFromHost("www.idefazei.com.br")).toBeNull();
    expect(getTenantSlugFromHost("admin.idefazei.com.br")).toBeNull();
    expect(getTenantSlugFromHost(undefined)).toBeNull();
  });

  it("torna URLs absolutas sem alterar as que já são https", () => {
    expect(absolutizeUrl("https://cdn.exemplo/x.webp", "https://igreja.idefazei.com.br")).toBe("https://cdn.exemplo/x.webp");
    expect(absolutizeUrl("/hero-presets/a.webp", "https://igreja.idefazei.com.br")).toBe("https://igreja.idefazei.com.br/hero-presets/a.webp");
    expect(absolutizeUrl(null, "https://igreja.idefazei.com.br")).toBeNull();
  });

  it("monta as tags com nome, descrição e imagem da igreja, escapando aspas", () => {
    const tags = renderTenantMetaTags(
      { name: 'Igreja "Boas Novas"', description: "Cultos aos domingos.", heroImageSrc: "https://cdn/x.webp", logoUrl: null, themeColor: "#114b45" },
      "https://boasnovas.idefazei.com.br"
    );
    expect(tags).toContain("<title>Igreja &quot;Boas Novas&quot;</title>");
    expect(tags).toContain('property="og:title" content="Igreja &quot;Boas Novas&quot;"');
    expect(tags).toContain('property="og:image" content="https://cdn/x.webp"');
    expect(tags).toContain('name="twitter:card" content="summary_large_image"');
    expect(tags).toContain('property="og:url" content="https://boasnovas.idefazei.com.br/"');
  });

  it("usa o preset do hero como imagem absoluta e cai no fallback quando não há imagem", () => {
    const origin = "https://ex.idefazei.com.br";
    const comPreset = renderTenantMetaTags({ name: "Ex", description: "d", heroImageSrc: "/hero-presets/hero-abstract-deep.webp", logoUrl: null, themeColor: "#1e3a5f" }, origin);
    expect(comPreset).toContain(`content="${origin}/hero-presets/hero-abstract-deep.webp"`);
    const semImagem = renderTenantMetaTags({ name: "Ex", description: "d", heroImageSrc: null, logoUrl: null, themeColor: "#1e3a5f" }, origin);
    expect(semImagem).toContain(`content="${origin}/hero-presets/hero-abstract-deep.webp"`);
  });

  it("substitui apenas o bloco demarcado e mantém o HTML quando não há marcadores", () => {
    const html = "<head>\n<!-- meta:start -->\n<title>Antigo</title>\n<!-- meta:end -->\n</head>";
    const out = injectTenantMeta(html, "<title>Novo</title>");
    expect(out).toContain("<title>Novo</title>");
    expect(out).not.toContain("<title>Antigo</title>");
    expect(injectTenantMeta("<head></head>", "<title>Novo</title>")).toBe("<head></head>");
  });

  it("o index.html tem os marcadores que o servidor substitui", () => {
    const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
    expect(html).toContain("<!-- meta:start -->");
    expect(html).toContain("<!-- meta:end -->");
    expect(html.indexOf("<!-- meta:start -->")).toBeLessThan(html.indexOf("<!-- meta:end -->"));
  });
});
