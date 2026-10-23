import { getTenantPublicMetaBySlug } from "./db";

const RESERVED_HOST_LABELS = new Set(["www", "admin"]);
const ROOT_HOSTS = new Set(["idefazei.com.br", "www.idefazei.com.br", "admin.idefazei.com.br"]);

/** Resolve o slug do tenant a partir do Host. Null para o domínio raiz/app. */
export function getTenantSlugFromHost(host: string | undefined): string | null {
  const hostname = host?.split(":")[0]?.toLowerCase() ?? "";
  if (!hostname || ROOT_HOSTS.has(hostname)) return null;
  const parts = hostname.split(".");
  return parts.length >= 3 && !RESERVED_HOST_LABELS.has(parts[0]) ? parts[0] : null;
}

export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Deixa a URL absoluta. Mantém http(s) como está; prefixa caminhos "/..." com a origem. */
export function absolutizeUrl(url: string | null | undefined, origin: string): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return origin + url;
  return null;
}

type TenantMeta = Awaited<ReturnType<typeof getTenantPublicMetaBySlug>>;

/** Monta o HTML das tags de título/descrição/OG/Twitter para um tenant. */
export function renderTenantMetaTags(meta: NonNullable<TenantMeta>, origin: string): string {
  const image = absolutizeUrl(meta.heroImageSrc, origin) || absolutizeUrl(meta.logoUrl, origin) || `${origin}/hero-presets/hero-abstract-deep.webp`;
  const url = `${origin}/`;
  const title = escapeHtmlAttr(meta.name);
  const desc = escapeHtmlAttr(meta.description);
  const img = escapeHtmlAttr(image);
  const href = escapeHtmlAttr(url);
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${desc}" />`,
    `<link rel="canonical" href="${href}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${title}" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta property="og:url" content="${href}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${desc}" />`,
    `<meta name="twitter:image" content="${img}" />`,
  ].join("\n    ");
}

const META_REGION = /<!-- meta:start -->[\s\S]*?<!-- meta:end -->/;

/** Substitui o bloco demarcado de meta no HTML. Sem marcadores, devolve o HTML intacto. */
export function injectTenantMeta(html: string, tags: string): string {
  return html.replace(META_REGION, `<!-- meta:start -->\n    ${tags}\n    <!-- meta:end -->`);
}

/**
 * Para um Host de tenant com site publicado, devolve o HTML com as tags por igreja.
 * Devolve null quando não há tenant publicado (o HTML padrão deve ser usado).
 */
export async function buildTenantHtml(html: string, host: string | undefined): Promise<string | null> {
  const slug = getTenantSlugFromHost(host);
  if (!slug) return null;
  const meta = await getTenantPublicMetaBySlug(slug);
  if (!meta) return null;
  const origin = `https://${(host ?? "").split(":")[0]}`;
  return injectTenantMeta(html, renderTenantMetaTags(meta, origin));
}
