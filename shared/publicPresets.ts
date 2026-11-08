// Catálogo de identidades visuais do site público (2026-11).
// A infraestrutura (tenant_themes: primaryColor/secondaryColor/accentColor/fontPair)
// já existe; aqui ficam os PRESETS curados que a igreja escolhe com um clique.
// Trocar de identidade só grava cores + fontPair nas colunas que já existem —
// sem migração. O par tipográfico vira as variáveis --tenant-font-display/body,
// aplicadas pelo TenantPublicShell e lidas pelo CSS .tenant-public-*.

export const DEFAULT_FONT_PAIR = "sacred_serif" as const;

/** Pares tipográficos. `google` alimenta o <link> do Google Fonts em client/index.html. */
export const FONT_PAIRS = {
  sacred_serif:     { label: "Playfair Display + Inter",     display: '"Playfair Display", Georgia, serif',   body: '"Inter", system-ui, sans-serif' },
  cormorant_inter:  { label: "Cormorant Garamond + Inter",   display: '"Cormorant Garamond", Georgia, serif', body: '"Inter", system-ui, sans-serif' },
  fraunces_figtree: { label: "Fraunces + Figtree",           display: '"Fraunces", Georgia, serif',           body: '"Figtree", system-ui, sans-serif' },
  space_inter:      { label: "Space Grotesk + Inter",        display: '"Space Grotesk", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif' },
  spectral_inter:   { label: "Spectral + Inter",             display: '"Spectral", Georgia, serif',           body: '"Inter", system-ui, sans-serif' },
  dmserif_worksans: { label: "DM Serif Display + Work Sans", display: '"DM Serif Display", Georgia, serif',    body: '"Work Sans", system-ui, sans-serif' },
  marcellus_inter:  { label: "Marcellus + Inter",            display: '"Marcellus", Georgia, serif',          body: '"Inter", system-ui, sans-serif' },
  cormorant_figtree:{ label: "Cormorant Garamond + Figtree", display: '"Cormorant Garamond", Georgia, serif', body: '"Figtree", system-ui, sans-serif' },
  fraunces_inter:   { label: "Fraunces + Inter",             display: '"Fraunces", Georgia, serif',           body: '"Inter", system-ui, sans-serif' },
  spectral_worksans:{ label: "Spectral + Work Sans",         display: '"Spectral", Georgia, serif',           body: '"Work Sans", system-ui, sans-serif' },
} as const;

export type FontPairId = keyof typeof FONT_PAIRS;
export const FONT_PAIR_IDS = Object.keys(FONT_PAIRS) as [FontPairId, ...FontPairId[]];

/** Identidades premium. Cada igreja escolhe uma; o ajuste fino de cor continua disponível.
 *  bg = fundo principal da página; surface = cartões/superfícies elevadas.
 *  onSecondaryColor = texto do botão (claro quando a cor de ação é escura).
 *  eyebrowColor = cor do detalhe/palavra do topo sobre o hero (quando a secundária não lê sobre a primária). */
export const IDENTITY_PRESETS = [
  { id: "marinho",  name: "Marinho & Ouro",      concept: "Clássica e confiável",        primaryColor: "#1e3a5f", secondaryColor: "#c9a84c", accentColor: "#c9a84c", bg: "#f8f4ed", surface: "#fffdf9", fontPair: "sacred_serif" },
  { id: "bordo",    name: "Bordô & Trigo",       concept: "Tradicional acolhedora",      primaryColor: "#5b2333", secondaryColor: "#c69a58", accentColor: "#c69a58", bg: "#f7f1ea", surface: "#fffaf4", fontPair: "cormorant_inter" },
  { id: "pinheiro", name: "Pinheiro & Terracota",concept: "Natural, de comunidade",      primaryColor: "#264a3b", secondaryColor: "#c56a4e", accentColor: "#d8a24a", bg: "#f4f3ec", surface: "#fffdf7", fontPair: "fraunces_figtree" },
  { id: "grafite",  name: "Grafite & Coral",     concept: "Jovem e urbana",              primaryColor: "#1c1c22", secondaryColor: "#ff6b57", accentColor: "#ffb347", bg: "#ffffff", surface: "#f6f6f8", fontPair: "space_inter" },
  { id: "indigo",   name: "Índigo & Lilás",      concept: "Contemporânea serena",        primaryColor: "#2a2a5c", secondaryColor: "#b79ae0", accentColor: "#d9b36a", bg: "#f4f3f8", surface: "#fffdfe", fontPair: "spectral_inter" },
  { id: "petroleo", name: "Petróleo & Âmbar",    concept: "Moderna e estável",           primaryColor: "#15414b", secondaryColor: "#e0a43b", accentColor: "#e0a43b", bg: "#f2f5f4", surface: "#fffefb", fontPair: "dmserif_worksans" },
  { id: "ardosia",  name: "Ardósia & Ouro suave",concept: "Minimalista elegante",        primaryColor: "#33404d", secondaryColor: "#b99a63", accentColor: "#b99a63", bg: "#f5f6f7", surface: "#ffffff", fontPair: "marcellus_inter" },
  { id: "ameixa",   name: "Ameixa & Rosé",       concept: "Calorosa e delicada",         primaryColor: "#4a2740", secondaryColor: "#c98b7a", accentColor: "#d4a75c", bg: "#f7f1f3", surface: "#fffbfa", fontPair: "cormorant_figtree" },
  { id: "onix",     name: "Ônix & Dourado",      concept: "Premium e sofisticada",       primaryColor: "#141414", secondaryColor: "#caa14e", accentColor: "#caa14e", bg: "#faf7f0", surface: "#ffffff", fontPair: "fraunces_inter" },
  { id: "cafe",     name: "Café & Cobre",        concept: "Rústica, de madeira e terra",  primaryColor: "#3b2a20", secondaryColor: "#b07a4a", accentColor: "#cf9b5b", bg: "#f4ede3", surface: "#fffaf2", fontPair: "spectral_worksans" },
  { id: "marsala",  name: "Marsala & Champanhe", concept: "Vinho quente e elegante",     primaryColor: "#6e3a36", secondaryColor: "#caa56c", accentColor: "#caa56c", bg: "#f6efe8", surface: "#fffbf6", fontPair: "fraunces_inter" },
  { id: "marssalv", name: "Marsala & Sálvia",    concept: "Vinho com verde, sofisticado", primaryColor: "#6e3a36", secondaryColor: "#b3c2a3", accentColor: "#caa56c", bg: "#f3f1ea", surface: "#fffdf8", fontPair: "cormorant_inter" },
  // Paleta do dono: navy na base, marsala como cor de ação (botão com texto claro), sálvia nos detalhes.
  { id: "trio",     name: "Marinho · Marsala · Sálvia", concept: "Navy na base, marsala no botão, sálvia nos detalhes", primaryColor: "#2c3e50", secondaryColor: "#9b4444", accentColor: "#9dc183", bg: "#f8f9fa", surface: "#e9ecef", onSecondaryColor: "#ffffff", eyebrowColor: "#9dc183", fontPair: "sacred_serif" },
] as const satisfies ReadonlyArray<{
  id: string; name: string; concept: string;
  primaryColor: string; secondaryColor: string; accentColor: string; bg: string; surface: string; fontPair: FontPairId;
  onSecondaryColor?: string; eyebrowColor?: string;
}>;

export type IdentityPreset = typeof IDENTITY_PRESETS[number];
export type IdentityPresetId = IdentityPreset["id"];

/** Resolve o par tipográfico (com fallback seguro) para as variáveis do shell. */
export function resolveFontPair(fontPair: unknown): { display: string; body: string } {
  const key = (typeof fontPair === "string" && fontPair in FONT_PAIRS ? fontPair : DEFAULT_FONT_PAIR) as FontPairId;
  const pair = FONT_PAIRS[key];
  return { display: pair.display, body: pair.body };
}

export function getIdentityPreset(id: unknown): IdentityPreset | undefined {
  return IDENTITY_PRESETS.find((preset) => preset.id === id);
}

export type TenantThemeInput = {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  fontPair?: string | null;
  templateKey?: string | null;
};

/**
 * Monta as variáveis CSS do site público a partir do tema salvo + identidade (templateKey).
 * Igrejas antigas (templateKey "ministerial_base") caem no preset Marinho, que reproduz o
 * visual atual (creme + Playfair/Inter) — sem regressão. Cores salvas sempre têm prioridade
 * sobre as do preset, preservando o ajuste fino da igreja.
 */
export function resolveTenantThemeVars(input: TenantThemeInput): Record<string, string> {
  const preset = getIdentityPreset(input.templateKey) ?? IDENTITY_PRESETS[0];
  const extra = preset as { onSecondaryColor?: string; eyebrowColor?: string };
  const primary = input.primaryColor || preset.primaryColor;
  const secondary = input.secondaryColor || preset.secondaryColor;
  const accent = input.accentColor || preset.accentColor;
  const fonts = resolveFontPair(input.fontPair || preset.fontPair);
  return {
    "--tenant-primary": primary,
    "--tenant-secondary": secondary,
    "--tenant-accent": accent,
    "--tenant-bg": preset.bg,
    "--tenant-surface": preset.surface,
    "--tenant-font-display": fonts.display,
    "--tenant-font-body": fonts.body,
    "--tenant-on-secondary": extra.onSecondaryColor ?? primary,
    "--tenant-eyebrow": extra.eyebrowColor ?? secondary,
  };
}
