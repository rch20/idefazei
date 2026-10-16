declare global {
  interface Window {
    __ideFazeiReady?: () => void;
    __ideFazeiShowRecovery?: () => void;
  }
}

// PWA: registro isolado para não bloquear a renderização no Safari iOS.
if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn("[PWA] Falha ao registrar Service Worker:", error);
    });
  });
}

import { trpc } from "@/lib/trpc";
import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import { clearChurchSession, getChurchToken } from "./hooks/useChurchAuth";
import { readBrowserStorage, removeBrowserStorage } from "./lib/browserStorage";
import { getBrowserSessionToken } from "./lib/sessionToken";
import "./index.css";

// Consultas de leitura podem permanecer frescas por um curto período entre
// navegações; mutations continuam invalidando explicitamente os dados afetados.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG || error.message === NOT_ADMIN_ERR_MSG;

  if (!isUnauthorized) return;

  const isAdminRoute = window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/");
  const hasChurchSession = Boolean(getChurchToken());
  const hasAdminSession = Boolean(readBrowserStorage("admin_token"));
  if (isAdminRoute) {
    if (hasAdminSession) {
      removeBrowserStorage("admin_token");
      window.location.href = "/admin/login";
      return;
    }
    window.location.href = getLoginUrl();
    return;
  }

  if (hasChurchSession) {
    clearChurchSession();
    window.location.href = "/login";
    return;
  }

  if (hasAdminSession) {
    removeBrowserStorage("admin_token");
    window.location.href = "/admin/login";
    return;
  }

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        const sessionToken = getBrowserSessionToken(window.location.pathname);
        const headers = new Headers(init?.headers);
        if (sessionToken) {
          headers.set("Authorization", `Bearer ${sessionToken}`);
        }

        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
          headers,
        }).then((response) => {
          const isAdminRoute = window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/");
          const requestUrl = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
          if (isAdminRoute && response.status === 207 && requestUrl.includes("superAdmin.")) {
            removeBrowserStorage("admin_token");
            window.location.href = "/admin/login";
          }
          return response;
        });
      },
    }),
  ],
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  window.__ideFazeiShowRecovery?.();
} else {
  createRoot(rootElement).render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
  window.setTimeout(() => window.__ideFazeiReady?.(), 0);
}
