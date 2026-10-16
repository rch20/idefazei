export const SOCIAL_PLATFORM_KEYS = ["instagram", "facebook", "youtube", "tiktok"] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORM_KEYS)[number];

export type SocialMediaLinks = Partial<Record<SocialPlatform, string>>;

export const SOCIAL_PLATFORM_META: Record<SocialPlatform, { label: string; hostname: string; description: string }> = {
  instagram: { label: "Instagram", hostname: "instagram.com", description: "Perfil, página ou canal da igreja" },
  facebook: { label: "Facebook", hostname: "facebook.com", description: "Página oficial da igreja" },
  youtube: { label: "YouTube", hostname: "youtube.com", description: "Canal ou transmissão da igreja" },
  tiktok: { label: "TikTok", hostname: "tiktok.com", description: "Perfil da igreja" },
};

const SOCIAL_ALLOWED_HOSTNAMES: Record<SocialPlatform, readonly string[]> = {
  instagram: ["instagram.com"],
  facebook: ["facebook.com", "fb.watch"],
  youtube: ["youtube.com", "youtu.be"],
  tiktok: ["tiktok.com"],
};

function hostnameMatches(hostname: string, allowed: readonly string[]) {
  return allowed.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

export function normalizeSocialMediaUrl(platform: SocialPlatform, value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (!hostnameMatches(url.hostname.toLowerCase(), SOCIAL_ALLOWED_HOSTNAMES[platform])) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function isValidSocialMediaUrl(platform: SocialPlatform, value: unknown) {
  return value === undefined || value === null || value === "" || normalizeSocialMediaUrl(platform, value) !== null;
}

export function normalizePublicWebsiteUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeSocialMediaLinks(value: unknown): SocialMediaLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  return SOCIAL_PLATFORM_KEYS.reduce<SocialMediaLinks>((links, platform) => {
    const normalized = normalizeSocialMediaUrl(platform, input[platform]);
    if (normalized) links[platform] = normalized;
    return links;
  }, {});
}
