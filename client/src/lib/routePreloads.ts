type RouteLoader = () => Promise<unknown>;

const routeLoaders: Record<string, RouteLoader> = {
  "/app/inicio": () => import("../pages/Inicio"),
  "/app/dashboard": () => import("../pages/Dashboard"),
  "/app/pessoas": () => import("../pages/Pessoas"),
  "/app/eventos": () => import("../pages/Eventos"),
  "/app/ministerios": () => import("../pages/Ministerios"),
  "/app/escalas": () => import("../pages/Escalas"),
  "/app/configuracoes": () => import("../pages/Configuracoes"),
  "/app/tesouraria": () => import("../pages/Tesouraria"),
  "/app/oracao": () => import("../pages/Oracao"),
  "/app/almas": () => import("../pages/GanharAlmas"),
  "/app/membro": () => import("../pages/AreaMembro"),
};

const preloads = new Map<string, Promise<void>>();

/**
 * Baixa uma rota somente após uma intenção clara de navegação.
 * O cache local evita várias requisições quando mouse, foco e toque ocorrem juntos.
 */
export function preloadRoute(path: string): Promise<void> | undefined {
  const route = path.split("?")[0];
  const loader = routeLoaders[route];
  if (!loader) return undefined;

  const existing = preloads.get(route);
  if (existing) return existing;

  const preload = loader()
    .then(() => undefined)
    .catch((error: unknown) => {
      preloads.delete(route);
      console.warn(`[performance] Não foi possível pré-carregar ${route}.`, error);
    });
  preloads.set(route, preload);
  return preload;
}
