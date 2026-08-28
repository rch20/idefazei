export const DEFAULT_HERO_PRESET_ID = "original" as const;

/** Opções atuais exibidas no painel: o visual legado permanece como fallback. */
export const HERO_PRESETS = [
  {
    id: "original",
    label: "Visual atual",
    description: "Mantém o Hero original do Ide Fazei.",
    src: null,
  },
  {
    id: "abstract-organic",
    label: "Orgânico claro",
    description: "Formas suaves, textura leve e acolhimento.",
    src: "/hero-presets/hero-abstract-organic.webp",
  },
  {
    id: "abstract-deep",
    label: "Gradiente profundo",
    description: "Profundidade, luz discreta e contraste elegante.",
    src: "/hero-presets/hero-abstract-deep.webp",
  },
  {
    id: "abstract-waves",
    label: "Ondas suaves",
    description: "Movimento sutil com sensação de leveza.",
    src: "/hero-presets/hero-abstract-waves.webp",
  },
  {
    id: "abstract-geometry",
    label: "Geometria minimalista",
    description: "Arcos e planos discretos para mais versatilidade.",
    src: "/hero-presets/hero-abstract-geometry.webp",
  },
] as const;

/** IDs legados continuam resolvíveis para não alterar Heros já publicados. */
const LEGACY_HERO_PRESETS = [
  { id: "community", label: "Comunidade", description: "Preset legado.", src: "/hero-presets/hero-community.webp" },
  { id: "worship", label: "Celebração", description: "Preset legado.", src: "/hero-presets/hero-worship.webp" },
  { id: "family", label: "Família", description: "Preset legado.", src: "/hero-presets/hero-family.webp" },
  { id: "abstract", label: "Essencial", description: "Preset legado.", src: "/hero-presets/hero-abstract.webp" },
] as const;

const ALL_HERO_PRESETS = [...HERO_PRESETS, ...LEGACY_HERO_PRESETS] as const;

export type HeroPresetId = typeof HERO_PRESETS[number]["id"];
export type StoredHeroPresetId = typeof ALL_HERO_PRESETS[number]["id"];
export const HERO_PRESET_IDS = ALL_HERO_PRESETS.map((preset) => preset.id) as [StoredHeroPresetId, ...StoredHeroPresetId[]];

export type HeroImageContent = {
  heroImageSource?: "preset" | "custom";
  heroImagePresetId?: StoredHeroPresetId | string | null;
  heroImageUrl?: string | null;
  heroImageAssetId?: number | null;
};

export function getHeroPreset(id: unknown) {
  return ALL_HERO_PRESETS.find((preset) => preset.id === id) ?? HERO_PRESETS[0];
}

export function resolveHeroImage(content: unknown) {
  const value = content && typeof content === "object" ? content as HeroImageContent : {};
  if (value.heroImageSource === "custom" && typeof value.heroImageUrl === "string" && /^https:\/\//.test(value.heroImageUrl)) {
    return { source: "custom" as const, label: "Imagem personalizada", src: value.heroImageUrl };
  }
  const preset = getHeroPreset(value.heroImagePresetId);
  return { source: "preset" as const, label: preset.label, src: preset.src };
}
