export const DEFAULT_PUBLIC_HERO_EYEBROW = "Comunidade de fé";

export function getPublicHeroEyebrow(sections: unknown, fallback = DEFAULT_PUBLIC_HERO_EYEBROW) {
  if (!Array.isArray(sections)) return fallback;
  const hero = sections.find((section) => section && typeof section === "object" && (section as { sectionType?: unknown }).sectionType === "hero");
  const content = hero && typeof hero === "object" ? (hero as { content?: unknown }).content : null;
  const eyebrow = content && typeof content === "object" ? (content as { eyebrow?: unknown }).eyebrow : null;
  return typeof eyebrow === "string" && eyebrow.trim() ? eyebrow.trim() : fallback;
}
