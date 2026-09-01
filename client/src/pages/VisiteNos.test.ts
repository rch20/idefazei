import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(resolve(process.cwd(), "client/src/pages/VisiteNos.tsx"), "utf8");
const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/TenantPublicPage.tsx"), "utf8");
const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

describe("Visite-nos público", () => {
  it("expõe uma rota própria e corrige o destino do card da página inicial", () => {
    expect(appSource).toContain('<Route path="/visite-nos" component={VisiteNos} />');
    expect(homeSource).toContain('href="/visite-nos"');
    expect(homeSource).not.toContain('href="/visitante" className="tenant-public-contact-card"><CalendarDays');
  });

  it("oferece no Hero um CTA discreto, alinhado ao principal, para encontrar uma Célula", () => {
    expect(homeSource).toContain('className="tenant-public-cell-cta"');
    expect(homeSource).toContain('href="/visite-nos#tenant-public-cells"');
    expect(homeSource).toContain("Encontrar uma Célula perto de você");
    expect(homeSource).toContain("aria-label=\"Encontrar uma Célula perto de você\"");
    expect(homeSource).toContain("tenant-public-cta");
    expect(homeSource).toContain("tenant-public-cell-cta");
    expect(pageSource).toContain('id="tenant-public-cells"');
  });

  it("usa apenas células públicas retornadas pelo tenant e mantém a proximidade no navegador", () => {
    expect(pageSource).toContain("data?.publicCells");
    expect(pageSource).toContain("navigator.geolocation.getCurrentPosition");
    expect(pageSource).toContain("distanceInKilometers(visitorLocation");
    expect(pageSource).not.toContain("visitorLocation:");
  });

  it("oferece mapa, WhatsApp autorizado e rota sem expor endereço aproximado", () => {
    expect(pageSource).toContain("<OpenStreetMap");
    expect(pageSource).toContain("getWhatsAppLinkWithMessage(cell.leaderWhatsapp");
    expect(pageSource).toContain('cell.locationMode === "exact" ? "Como chegar" : "Ver região"');
    expect(pageSource).toContain("function mapsSearchLink(cell: PublicCell)");
    expect(pageSource).toContain("function mapsDirectionsLink(cell: PublicCell)");
    expect(pageSource).toContain("[cell.address, cell.city, cell.state].filter(Boolean).join");
    expect(pageSource).toContain("href={mapsSearchLink(cell)}");
    expect(pageSource).toContain("href={mapsDirectionsLink(cell)}");
    expect(dbSource).toContain("state: cells.state");
    expect(dbSource).toContain("address: exactLocation ? row.address : null");
    expect(dbSource).toContain("Math.round(latitude * 100) / 100");
  });
});
