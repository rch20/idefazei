import { describe, expect, it } from "vitest";
import { DEFAULT_HERO_PRESET_ID, HERO_PRESETS, resolveHeroImage } from "../shared/publicHero";

describe("public hero image selection", () => {
  it("keeps the current Hero as the default for legacy tenants", () => {
    const result = resolveHeroImage({});
    expect(DEFAULT_HERO_PRESET_ID).toBe("original");
    expect(result.source).toBe("preset");
    expect(result.src).toBeNull();
  });

  it("resolves every predefined image without exposing an unknown id", () => {
    expect(HERO_PRESETS).toHaveLength(5);
    expect(HERO_PRESETS.map((preset) => preset.id)).toEqual(["original", "abstract-organic", "abstract-deep", "abstract-waves", "abstract-geometry"]);
    expect(resolveHeroImage({ heroImageSource: "preset", heroImagePresetId: "abstract-geometry" })).toMatchObject({ src: "/hero-presets/hero-abstract-geometry.webp", mobileSrc: "/hero-presets/mobile/hero-abstract-geometry-mobile.webp" });
    expect(resolveHeroImage({ heroImageSource: "preset", heroImagePresetId: "community" }).src).toBe("/hero-presets/hero-community.webp");
    expect(resolveHeroImage({ heroImageSource: "preset", heroImagePresetId: "unknown" }).src).toBeNull();
  });

  it("prioritizes a tenant custom image only when it is an absolute HTTPS URL", () => {
    expect(resolveHeroImage({ heroImageSource: "custom", heroImageUrl: "https://res.cloudinary.com/example/image/upload/hero.webp" })).toMatchObject({ source: "custom", src: "https://res.cloudinary.com/example/image/upload/hero.webp" });
    expect(resolveHeroImage({ heroImageSource: "custom", heroImageUrl: "/hero.webp" }).source).toBe("preset");
  });
});
