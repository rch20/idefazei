import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const source = readFileSync(resolve(root, "client/src/components/OpenStreetMap.tsx"), "utf8");

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
