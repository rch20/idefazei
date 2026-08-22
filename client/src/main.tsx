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
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import { clearChurchSession, getChurchToken } from "./hooks/useChurchAuth";
import "./index.css";

const queryClient = new QueryClient();

const readBrowserStorage = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  const hasChurchSession = Boolean(getChurchToken());
  const hasAdminSession = Boolean(readBrowserStorage("admin_token"));
  if (hasChurchSession) {
    clearChurchSession();
    window.location.href = "/login";
    return;
  }

  if (hasAdminSession) {
    try {
      localStorage.removeItem("admin_token");
    } catch {
      // Em navegadores com armazenamento restrito, apenas redireciona para o login.
    }
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
        const churchToken = getChurchToken();
        const adminToken = localStorage.getItem("admin_token");
        const sessionToken = churchToken ?? adminToken;
        const headers = new Headers(init?.headers);
        if (sessionToken) {
          headers.set("Authorization", `Bearer ${sessionToken}`);
        }

        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
          headers,
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
