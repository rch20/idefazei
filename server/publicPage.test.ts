import { describe, expect, it } from "vitest";
import { DEFAULT_PUBLIC_HERO_EYEBROW, getPublicHeroEyebrow } from "../shared/publicPage";

describe("public page hero eyebrow", () => {
  it("uses the configured phrase from the hero section", () => {
    expect(getPublicHeroEyebrow([{ sectionType: "hero", content: { eyebrow: "Uma família para pertencer" } }])).toBe("Uma família para pertencer");
  });

  it("trims whitespace and falls back for missing or blank legacy content", () => {
    expect(getPublicHeroEyebrow([{ sectionType: "hero", content: { eyebrow: "  Igreja que acolhe  " } }])).toBe("Igreja que acolhe");
    expect(getPublicHeroEyebrow([{ sectionType: "hero", content: { eyebrow: "   " } }])).toBe(DEFAULT_PUBLIC_HERO_EYEBROW);
    expect(getPublicHeroEyebrow([{ sectionType: "about", content: { eyebrow: "Ignorar" } }])).toBe(DEFAULT_PUBLIC_HERO_EYEBROW);
    expect(getPublicHeroEyebrow(null)).toBe(DEFAULT_PUBLIC_HERO_EYEBROW);
  });
});
