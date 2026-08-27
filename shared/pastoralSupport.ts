export const DEFAULT_PASTORAL_SUPPORT_LABEL = "Converse com o Pastor";
export const DEFAULT_PASTORAL_SUPPORT_URL = "https://dedodeprosa.diaebeleza.com.br";

export type PastoralSupportAudience = "public" | "authenticated";

export type PastoralSupportConfig = {
  url: string | null;
  label: string;
  enabled: boolean;
  showPublic: boolean;
  showAuthenticated: boolean;
};

const ALLOWED_HOSTNAMES = ["dedodeprosa.diaebeleza.com.br"] as const;

function isAllowedHostname(hostname: string) {
  return ALLOWED_HOSTNAMES.some((allowed) => hostname === allowed);
}

export function normalizePastoralSupportUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (!isAllowedHostname(url.hostname.toLowerCase())) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizePastoralSupportLabel(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_PASTORAL_SUPPORT_LABEL;
  const label = value.trim().replace(/\s+/g, " ").slice(0, 80);
  return label || DEFAULT_PASTORAL_SUPPORT_LABEL;
}

export function normalizePastoralSupportConfig(value: unknown): PastoralSupportConfig {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const url = normalizePastoralSupportUrl(source.url);
  return {
    url,
    label: normalizePastoralSupportLabel(source.label),
    enabled: source.enabled === true,
    showPublic: source.showPublic === true,
    showAuthenticated: source.showAuthenticated === true,
  };
}

export function shouldShowPastoralSupport(value: unknown, audience: PastoralSupportAudience) {
  const config = normalizePastoralSupportConfig(value);
  return config.enabled && Boolean(config.url) && (audience === "public" ? config.showPublic : config.showAuthenticated);
}
