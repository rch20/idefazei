// Service Worker — Ide Fazei
// Estratégia: Cache-First para assets estáticos, Network-First para API

const CACHE_NAME = "lampas-v3";

// Instalar
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Ativar e limpar caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Interceptar requisições
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições de API — sempre vai para a rede
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Ignorar requisições de outros domínios
  if (url.origin !== self.location.origin) {
    return;
  }

  // Ignorar arquivos do Vite dev server (/@vite/, /@fs/, etc.) e arquivos com ?v= ou ?t=
  if (
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/__vite") ||
    url.pathname.startsWith("/__manus") ||
    url.searchParams.has("v") ||
    url.searchParams.has("t")
  ) {
    return; // Deixar o browser buscar diretamente da rede
  }

  // Para navegação (HTML), sempre vai para a rede
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/"))
    );
    return;
  }

  // Para assets estáticos conhecidos (manifest, icons), Cache-First
  if (
    url.pathname === "/manifest.json" ||
    url.pathname.startsWith("/icon-") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok && request.method === "GET") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }
  // Para todo o resto (JS, CSS, etc.), sempre vai para a rede — sem cache
});

// Receber notificações push
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Ide Fazei", body: event.data.text() };
  }
  const options = {
    body: data.body || "Nova notificação da sua igreja",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
    vibrate: [100, 50, 100],
  };
  event.waitUntil(
    self.registration.showNotification(data.title || "Ide Fazei", options)
  );
});

// Clique na notificação abre a URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
