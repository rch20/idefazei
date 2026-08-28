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
    expect(css).toContain(".tenant-public-contact-grid, .tenant-public-events-grid, .tenant-public-announcements-grid, .tenant-public-ministries-grid, .tenant-public-services-grid { grid-template-columns: 1fr; }");
    expect(css).toContain(".tenant-public-event-card { min-width: 0;");
  });

  it("mantém os cartões de Ministérios em uma grade segura e empilhada no mobile", () => {
    expect(css).toContain(".tenant-public-ministries-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));");
    expect(css).toContain(".tenant-public-ministry-card { display: flex; min-width: 0;");
    expect(css).toContain(".tenant-public-contact-grid, .tenant-public-events-grid, .tenant-public-announcements-grid, .tenant-public-ministries-grid, .tenant-public-services-grid { grid-template-columns: 1fr; }");
  });

  it("mantém horários em cartões estáveis sem expansão horizontal", () => {
    expect(css).toContain(".tenant-public-services-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));");
    expect(css).toContain(".tenant-public-service-card { display: flex; min-width: 0;");
    expect(css).toContain(".tenant-public-contact-grid, .tenant-public-events-grid, .tenant-public-announcements-grid, .tenant-public-ministries-grid, .tenant-public-services-grid { grid-template-columns: 1fr; }");
  });

  it("mantém a galeria contida, com imagens proporcionais e duas colunas no mobile", () => {
    expect(css).toContain(".tenant-public-gallery-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));");
    expect(css).toContain(".tenant-public-gallery-item { min-width: 0; overflow: hidden;");
    expect(css).toContain(".tenant-public-gallery-item img { display: block; width: 100%; max-width: 100%; aspect-ratio: 4 / 3; object-fit: cover;");
    expect(css).toContain(".tenant-public-gallery-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }");
  });

  it("mantém o hero compacto no mobile e sinaliza continuidade sem ruído visual", () => {
    const page = readFileSync(resolve(process.cwd(), "client/src/pages/TenantPublicPage.tsx"), "utf8");
    expect(page).toContain('id="tenant-public-content"');
    expect(page).toContain("tenant-public-scroll-cue");
    expect(page).toContain("resolveHeroImage(hero)");
    expect(page).toContain('className="tenant-public-hero-image"');
    expect(page).toContain('className="tenant-public-hero-media"');
    expect(page).toContain('media="(max-width: 44rem)"');
    expect(css).toContain(".tenant-public-hero-media {");
    expect(css).toContain(".tenant-public-hero-overlay {");
    expect(css).toContain(".tenant-public-hero.has-image::after { display: none; }");
    expect(css).toContain("background-size: cover;");
    expect(page).toContain("Descubra mais");
    expect(page).toContain("Continuar para conhecer mais sobre a igreja");
    expect(css).toContain(".tenant-public-hero { min-height: max(34rem, calc(100svh - 4.5rem));");
    expect(css).toContain(".tenant-public-scroll-cue { bottom: .8rem;");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("protege a seção de Avisos Públicos com mídia, destaque e CTA responsivo", () => {
    const page = readFileSync(resolve(process.cwd(), "client/src/pages/TenantPublicPage.tsx"), "utf8");
    expect(page).toContain("data.publicAnnouncements.length > 0");
    expect(page).toContain("tenant-public-announcements-section");
    expect(page).toContain("tenant-public-announcement-image");
    expect(page).toContain("tenant-public-announcement-action");
    expect(page).toContain("ANNOUNCEMENT_TYPE_LABELS");
    expect(page).not.toContain("announcements.list.useQuery");
  });

  it("compacta textos longos em duas linhas e oferece leitura completa sem alterar o conteúdo", () => {
    const page = readFileSync(resolve(process.cwd(), "client/src/pages/TenantPublicPage.tsx"), "utf8");
    expect(page).toContain("ANNOUNCEMENT_SUMMARY_CHAR_LIMIT");
    expect(page).toContain("shouldShowAnnouncementDetails");
    expect(page).toContain("tenant-public-announcement-summary");
    expect(page).toContain('aria-haspopup="dialog"');
    expect(page).toContain("Ver mais");
    expect(css).toContain("-webkit-line-clamp: 2");
    expect(css).toContain(".tenant-public-announcement-details-trigger");
    expect(page).toContain("tenant-public-announcement-dialog");
    expect(page).toContain("tenant-public-announcement-full-content");
    expect(page).toContain("selectedAnnouncement?.content");
    expect(page).toContain("target={isExternal ? \"_blank\" : undefined}");
  });

  it("mantém o resumo e o modal de texto separados do lightbox de imagem", () => {
    const page = readFileSync(resolve(process.cwd(), "client/src/pages/TenantPublicPage.tsx"), "utf8");
    expect(page).toContain("expandedAnnouncementImage");
    expect(page).toContain("selectedAnnouncement");
    expect(page).toContain("tenant-public-image-dialog");
    expect(page).toContain("tenant-public-announcement-dialog");
  });

  it("exibe rodapé institucional responsivo com redes sociais opcionais", () => {
    const page = readFileSync(resolve(process.cwd(), "client/src/pages/TenantPublicPage.tsx"), "utf8");
    const visiteNos = readFileSync(resolve(process.cwd(), "client/src/pages/VisiteNos.tsx"), "utf8");
    const portalVisitante = readFileSync(resolve(process.cwd(), "client/src/pages/PortalVisitante.tsx"), "utf8");
    const footer = readFileSync(resolve(process.cwd(), "client/src/components/TenantPublicFooter.tsx"), "utf8");
    expect(page).toContain("<TenantPublicFooter church={data.church} eyebrow={publicHeroEyebrow} />");
    expect(visiteNos).toContain("<TenantPublicFooter church={data.church} eyebrow={publicHeroEyebrow} />");
    expect(portalVisitante).toContain("<TenantPublicFooter church={tenantPublic.data.church} eyebrow={publicHeroEyebrow} />");
    expect(footer).toContain("normalizeSocialMediaLinks");
    expect(footer).toContain("socialLinks.length > 0");
    expect(footer).toContain("target=\"_blank\" rel=\"noreferrer\"");
    expect(footer).toContain("tenant-public-footer-support-link");
    expect(footer).toContain("Atendimento pastoral em um ambiente reservado e acolhedor.");
    expect(css).toContain(".tenant-public-footer-grid");
    expect(css).toContain(".tenant-public-footer-social-links");
    expect(css).toContain(".tenant-public-footer-grid, .tenant-public-footer-grid--support { grid-template-columns: 1fr;");
  });

  it("oferece uma ação pública direta de Pedido de Oração no subdomínio da igreja", () => {
    const page = readFileSync(resolve(process.cwd(), "client/src/pages/TenantPublicPage.tsx"), "utf8");
    const visitorPortal = readFileSync(resolve(process.cwd(), "client/src/pages/PortalVisitante.tsx"), "utf8");
    expect(page).toContain('href="/visitante?tipo=pedido_oracao"');
    expect(visitorPortal).toContain("requestedType");
    expect(visitorPortal).toContain("churchSlug, email: data.email || undefined");
  });
});
