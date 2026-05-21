const OFFLINE_FALLBACK_HTML = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sistema de Depósito General - Artilleria 1 - Offline</title>
  </head>
  <body>
    <main style="font-family: sans-serif; margin: 2rem;">
      <h1>Sin conexion</h1>
      <p>No hay red disponible en este momento.</p>
    </main>
  </body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  // Nunca cachear recursos dinamicos de Next o API: evita mezclar HTML/JS de builds distintos.
  if (requestUrl.pathname.startsWith("/_next/") || requestUrl.pathname.startsWith("/api/")) {
    return;
  }

  // Navegacion: siempre red primero para no hidratar con HTML viejo.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(OFFLINE_FALLBACK_HTML, {
          status: 200,
          statusText: "OK",
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }),
    );
    return;
  }
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Sistema de Depósito General - Artilleria 1",
    body: "Nueva actividad registrada.",
    url: "/",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        title: parsed.title || payload.title,
        body: parsed.body || payload.body,
        url: parsed.url || payload.url,
      };
    } catch {
      // Keep default payload.
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/pwa-icons/android/icon-192.png",
      badge: "/pwa-icons/android/icon-192.png",
      data: { url: payload.url },
      tag: "deposito-art1-admin",
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((client) => "focus" in client);
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
