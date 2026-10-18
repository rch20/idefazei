import { lazy, type ComponentType, type LazyExoticComponent } from "react";

type LazyLoader<T extends ComponentType<any>> = () => Promise<{ default: T }>;

type StartupWindow = Window & {
  __ideFazeiRecover?: () => Promise<void>;
};

const RETRY_PREFIX = "ide_fazei_lazy_retry:";
const RELOAD_PARAM = "ide_fazei_reload";

function isChunkLoadError(error: unknown) {
  const message = String(
    error instanceof Error ? error.message : error
  ).toLowerCase();
  return [
    "failed to fetch dynamically imported module",
    "importing a module script failed",
    "chunkloaderror",
    "loading chunk",
    "failed to fetch module",
    "unexpected token '<'",
    "err_module_not_found",
  ].some(pattern => message.includes(pattern));
}

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getRetryKey(moduleName: string) {
  return `${RETRY_PREFIX}${moduleName}`;
}

export async function loadModuleWithRetry<T extends ComponentType<any>>(
  moduleName: string,
  loader: LazyLoader<T>
): Promise<{ default: T }> {
  try {
    const module = await loader();
    getStorage()?.removeItem(getRetryKey(moduleName));
    return module;
  } catch (error) {
    if (typeof window === "undefined" || !isChunkLoadError(error)) throw error;

    const storage = getStorage();
    if (!storage) throw error;
    const retryKey = getRetryKey(moduleName);
    if (storage.getItem(retryKey) === "1") throw error;

    try {
      storage.setItem(retryKey, "1");
    } catch {
      throw error;
    }
    const recover = (window as StartupWindow).__ideFazeiRecover;
    if (recover) {
      await recover();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set(RELOAD_PARAM, String(Date.now()));
      window.location.replace(url.toString());
    }

    throw error;
  }
}

export function lazyWithRetry<T extends ComponentType<any>>(
  moduleName: string,
  loader: LazyLoader<T>
): LazyExoticComponent<T> {
  return lazy(() => loadModuleWithRetry(moduleName, loader));
}
