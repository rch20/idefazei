export function readBrowserStorage(key: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
  } catch {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
}

export function removeBrowserStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // O navegador pode restringir o armazenamento persistente.
  }

  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // A sessão em memória pode continuar indisponível em alguns contextos.
  }
}
