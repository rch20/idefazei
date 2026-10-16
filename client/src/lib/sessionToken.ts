import { readBrowserStorage } from "./browserStorage";

export function getBrowserSessionToken(pathname?: string): string | null {
  const currentPath = pathname ?? (typeof window === "undefined" ? "" : window.location.pathname);
  const adminToken = readBrowserStorage("admin_token");

  if (currentPath === "/admin" || currentPath.startsWith("/admin/")) {
    return adminToken;
  }

  return readBrowserStorage("church_token") ?? adminToken;
}
