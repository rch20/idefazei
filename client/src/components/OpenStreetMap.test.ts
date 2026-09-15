import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const source = readFileSync(resolve(root, "client/src/components/OpenStreetMap.tsx"), "utf8");

describe("configuração do provedor de tiles", () => {
  it("usa MapTiler configurável e não o endpoint público bloqueado do OSM", () => {
    expect(source).toContain("VITE_MAPTILER_KEY");
    expect(source).toContain("VITE_MAP_TILE_URL");
    expect(source).toContain("api.maptiler.com/maps/streets-v4/256/{z}/{x}/{y}.png");
    expect(source).not.toContain("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
  });

  it("expõe falha de tiles de forma visível", () => {
    expect(source).toContain("tileerror");
    expect(source).toContain("Mapa de ruas temporariamente indisponível");
    expect(source).toContain('role="status"');
  });
});

describe("estabilidade do mapa Leaflet", () => {
  it("monta o mapa uma vez por montagem do componente", () => {
    expect(source).toContain("if (!containerRef.current || mapRef.current) return;");
    expect(source).toContain("// O mapa deve ser criado uma vez por montagem.");
    expect(source).toContain("}, []);");
  });

  it("atualiza marcadores sem destruir a instância do mapa", () => {
    expect(source).toContain("layer.clearLayers();");
    expect(source).toContain("map.fitBounds(bounds");
    expect(source).toContain("map.setView([initialCenter.latitude, initialCenter.longitude], initialZoom);");
    expect(source).toContain("map.remove();");
  });
});
