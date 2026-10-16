import { describe, expect, it } from "vitest";
import { distanceInKilometers } from "./geo";

describe("distanceInKilometers", () => {
  it("retorna zero para o mesmo ponto", () => {
    expect(distanceInKilometers({ latitude: -23.5505, longitude: -46.6333 }, { latitude: -23.5505, longitude: -46.6333 })).toBe(0);
  });

  it("calcula uma distância coerente entre dois pontos conhecidos", () => {
    const distance = distanceInKilometers(
      { latitude: -23.5505, longitude: -46.6333 },
      { latitude: -23.5614, longitude: -46.6559 },
    );
    expect(distance).toBeGreaterThan(2);
    expect(distance).toBeLessThan(3);
  });
});
