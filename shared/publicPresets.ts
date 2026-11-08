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

// ─── Contraste (WCAG) ────────────────────────────────────────────────────────
// Deriva cores legíveis a partir das cores de marca, garantindo AA. Mantém o tom
// (apenas escurece/clareia) para não descaracterizar a identidade escolhida.
function toRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)) as [number, number, number];
}
function toHex(rgb: number[]): string {
  return "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
function mix(a: string, b: string, t: number): string {
  const ra = toRgb(a), rb = toRgb(b);
  return toHex(ra.map((v, i) => v * t + rb[i] * (1 - t)));
}
function luminance(hex: string): number {
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = toRgb(hex);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a: string, b: string): number {
  const l1 = luminance(a), l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
/** Rótulo pequeno legível sobre fundo claro: escurece a cor de marca até passar AA (4.5). */
function readableLabel(color: string, bg: string): string {
  for (let t = 1; t >= 0.15; t -= 0.05) { const c = mix(color, "#000000", t); if (contrast(c, bg) >= 4.5) return c; }
  return mix(color, "#000000", 0.15);
}
/** Detalhe sobre o hero escuro: clareia a cor de marca até ler sobre a primária (>=3). */
function readableEyebrow(color: string, primary: string): string {
  if (contrast(color, primary) >= 3) return color;
  for (let t = 0.9; t >= 0; t -= 0.1) { const c = mix(color, "#ffffff", t); if (contrast(c, primary) >= 3) return c; }
  return "#ffffff";
}
/** Botão de ação: usa a secundária com o texto que melhor contrasta; se nenhum passa AA,
 *  escurece o fundo do botão (mantendo o tom) e usa texto branco. */
function readableCta(secondary: string, primary: string): { bg: string; text: string } {
  if (contrast(primary, secondary) >= 4.5) return { bg: secondary, text: primary };
  if (contrast("#ffffff", secondary) >= 4.5) return { bg: secondary, text: "#ffffff" };
  for (let t = 1; t >= 0.2; t -= 0.05) { const bg = mix(secondary, "#000000", t); if (contrast("#ffffff", bg) >= 4.5) return { bg, text: "#ffffff" }; }
  return { bg: mix(secondary, "#000000", 0.2), text: "#ffffff" };
}

/**
 * Monta as variáveis CSS do site público a partir do tema salvo + identidade (templateKey).
 * Igrejas antigas (templateKey "ministerial_base") caem no preset Marinho, que reproduz o
 * visual atual (creme + Playfair/Inter) — sem regressão. Cores salvas sempre têm prioridade
 * sobre as do preset, preservando o ajuste fino da igreja. Rótulo, eyebrow e botão são
 * derivados para garantir contraste AA em qualquer identidade.
 */
export function resolveTenantThemeVars(input: TenantThemeInput): Record<string, string> {
  const preset = getIdentityPreset(input.templateKey) ?? IDENTITY_PRESETS[0];
  const extra = preset as { onSecondaryColor?: string; eyebrowColor?: string };
  const primary = input.primaryColor || preset.primaryColor;
  const secondary = input.secondaryColor || preset.secondaryColor;
  const accent = input.accentColor || preset.accentColor;
  const fonts = resolveFontPair(input.fontPair || preset.fontPair);
  const cta = extra.onSecondaryColor ? { bg: secondary, text: extra.onSecondaryColor } : readableCta(secondary, primary);
  return {
    "--tenant-primary": primary,
    "--tenant-secondary": secondary,
    "--tenant-accent": accent,
    "--tenant-bg": preset.bg,
    "--tenant-surface": preset.surface,
    "--tenant-font-display": fonts.display,
    "--tenant-font-body": fonts.body,
    "--tenant-label": readableLabel(secondary, preset.bg),
    "--tenant-eyebrow": extra.eyebrowColor ?? readableEyebrow(secondary, primary),
    "--tenant-cta-bg": cta.bg,
    "--tenant-on-secondary": cta.text,
  };
}
