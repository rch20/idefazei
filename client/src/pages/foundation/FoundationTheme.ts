const DEFAULT_PRIMARY = "#1e3a5f";
const DEFAULT_ACCENT = "#c9a84c";
const DARK_FOREGROUND = "#172033";
const LIGHT_FOREGROUND = "#ffffff";

export type FoundationTheme = {
  primary: string;
  accent: string;
  primarySoft: string;
  accentSoft: string;
  primaryForeground: string;
  accentForeground: string;
  focusRing: string;
};

function normalizeHexColor(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim() ?? "";
  const match = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return fallback;

  const hex =
    match[1].length === 3
      ? match[1]
          .split("")
          .map(part => `${part}${part}`)
          .join("")
      : match[1];

  return `#${hex.toLowerCase()}`;
}

function hexToRgb(hex: string) {
  const value = hex.slice(1);
  return {
    red: Number.parseInt(value.slice(0, 2), 16),
    green: Number.parseInt(value.slice(2, 4), 16),
    blue: Number.parseInt(value.slice(4, 6), 16),
  };
}

function relativeLuminance(hex: string) {
  const { red, green, blue } = hexToRgb(hex);
  const channels = [red, green, blue].map(channel => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first: string, second: string) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function readableForeground(background: string) {
  const lightContrast = contrastRatio(background, LIGHT_FOREGROUND);
  const darkContrast = contrastRatio(background, DARK_FOREGROUND);
  return lightContrast >= darkContrast ? LIGHT_FOREGROUND : DARK_FOREGROUND;
}

function blendWithWhite(hex: string, colorWeight: number) {
  const { red, green, blue } = hexToRgb(hex);
  const weight = Math.min(1, Math.max(0, colorWeight));
  const mix = (channel: number) =>
    Math.round(channel * weight + 255 * (1 - weight));
  return `#${[mix(red), mix(green), mix(blue)]
    .map(channel => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function makeFoundationSoftColor(
  color: string,
  amount: number,
  fallback = "white"
) {
  return `color-mix(in srgb, ${color} ${amount}%, ${fallback})`;
}

export function createFoundationTheme(
  primaryColor?: string | null,
  secondaryColor?: string | null
): FoundationTheme {
  const primary = normalizeHexColor(primaryColor, DEFAULT_PRIMARY);
  const accent = normalizeHexColor(secondaryColor, DEFAULT_ACCENT);

  return {
    primary,
    accent,
    primarySoft: blendWithWhite(primary, 0.08),
    accentSoft: blendWithWhite(accent, 0.12),
    primaryForeground: readableForeground(primary),
    accentForeground: readableForeground(accent),
    focusRing: primary,
  };
}
