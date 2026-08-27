export const DEFAULT_HERO_PRESET_ID = "original" as const;

export const HERO_PRESETS = [
  {
    id: "original",
    label: "Visual atual",
    description: "Mantém o Hero original do Ide Fazei.",
    src: null,
  },
  {
    id: "community",
    label: "Comunidade",
    description: "Acolhimento e conexão entre pessoas.",
    src: "/hero-presets/hero-community.webp",
  },
  {
    id: "worship",
    label: "Celebração",
    description: "Um ambiente de louvor e esperança.",
    src: "/hero-presets/hero-worship.webp",
  },
  {
    id: "family",
    label: "Família",
    description: "Relacionamentos e caminhada em comunidade.",
    src: "/hero-presets/hero-family.webp",
  },
  {
    id: "abstract",
    label: "Essencial",
    description: "Uma composição abstrata e elegante.",
    src: "/hero-presets/hero-abstract.webp",
  },
] as const;

export type HeroPresetId = typeof HERO_PRESETS[number]["id"];
export const HERO_PRESET_IDS = HERO_PRESETS.map((preset) => preset.id) as [HeroPresetId, ...HeroPresetId[]];

export type HeroImageContent = {
  heroImageSource?: "preset" | "custom";
  heroImagePresetId?: HeroPresetId | string | null;
  heroImageUrl?: string | null;
  heroImageAssetId?: number | null;
};

export function getHeroPreset(id: unknown) {
  return HERO_PRESETS.find((preset) => preset.id === id) ?? HERO_PRESETS[0];
}

export function resolveHeroImage(content: unknown) {
  const value = content && typeof content === "object" ? content as HeroImageContent : {};
  if (value.heroImageSource === "custom" && typeof value.heroImageUrl === "string" && /^https:\/\//.test(value.heroImageUrl)) {
    return { source: "custom" as const, label: "Imagem personalizada", src: value.heroImageUrl };
  }
  const preset = getHeroPreset(value.heroImagePresetId);
  return { source: "preset" as const, label: preset.label, src: preset.src };
}
