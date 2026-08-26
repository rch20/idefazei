import { useEffect } from "react";

type TenantPwaMetaInput = {
  tenantSlug?: string | null;
  tenantName?: string | null;
  primaryColor?: string | null;
  pwaIconAssetId?: number | null;
};

function setOrCreateLink(rel: string, href: string, sizes?: string) {
  const selector = `link[data-ide-fazei-tenant-pwa="${rel}"]`;
  let element = document.head.querySelector<HTMLLinkElement>(selector) ?? document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.dataset.ideFazeiTenantPwa = rel;
  element.href = href;
  if (sizes) element.sizes = sizes;
  return element;
}

function setOrCreateMeta(name: string, content: string) {
  const selector = `meta[data-ide-fazei-tenant-pwa="${name}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector) ?? document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.name = name;
    document.head.appendChild(element);
  }
  element.dataset.ideFazeiTenantPwa = name;
  element.content = content;
  return element;
}

export function useTenantPwaMeta({ tenantSlug, tenantName, primaryColor, pwaIconAssetId }: TenantPwaMetaInput) {
  useEffect(() => {
    if (!tenantSlug) return;
    const query = `?tenant=${encodeURIComponent(tenantSlug)}${pwaIconAssetId ? `&v=${pwaIconAssetId}` : ""}`;
    const icon192 = `/api/pwa/icon-192.png${query}`;
    const originalTitle = document.title;
    const originalIcon = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href;
    const originalApple = document.head.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')?.href;
    const originalManifest = document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href;
    const originalThemeColor = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content;

    const icon = setOrCreateLink("icon", icon192, "192x192");
    const apple = setOrCreateLink("apple-touch-icon", icon192, "192x192");
    const manifest = setOrCreateLink("manifest", `/manifest.json${query}`);
    const themeColor = setOrCreateMeta("theme-color", primaryColor || "#1e3a5f");
    document.title = tenantName ? `${tenantName} — Ide Fazei` : originalTitle;

    return () => {
      if (icon.dataset.ideFazeiTenantPwa) {
        if (originalIcon) icon.href = originalIcon;
        else icon.remove();
      }
      if (apple.dataset.ideFazeiTenantPwa) {
        if (originalApple) apple.href = originalApple;
        else apple.remove();
      }
      if (manifest.dataset.ideFazeiTenantPwa) {
        if (originalManifest) manifest.href = originalManifest;
        else manifest.remove();
      }
      if (themeColor.dataset.ideFazeiTenantPwa) {
        if (originalThemeColor) themeColor.content = originalThemeColor;
        else themeColor.remove();
      }
      document.title = originalTitle;
    };
  }, [pwaIconAssetId, primaryColor, tenantName, tenantSlug]);
}
