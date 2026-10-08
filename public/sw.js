// Service worker do Bolso: offline básico (Sprint 4.2).
// - Arquivos do build (/_next/static) são imutáveis: cache primeiro.
// - Páginas: rede primeiro; sem internet, mostra a última versão vista ou a página "Sem internet".
// - Nada que grava (POST, server actions) passa pelo cache.
// - Notificações (1.7.3): mostra o que o servidor mandou e, ao tocar, abre a tela certa.
const VERSAO = "bolso-v1";
const ESTATICOS = `${VERSAO}-estaticos`;
const PAGINAS = `${VERSAO}-paginas`;
const OFFLINE = "/offline";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(PAGINAS)
      .then((cache) => cache.addAll([OFFLINE, "/icone-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => !n.startsWith(VERSAO)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    evento.respondWith(
      caches.match(req).then(
        (salvo) =>
          salvo ||
          fetch(req).then((resp) => {
            const copia = resp.clone();
            caches.open(ESTATICOS).then((c) => c.put(req, copia));
            return resp;
          }),
      ),
    );
    return;
  }

  // Navegação de página (documento HTML)
  if (req.mode === "navigate") {
    evento.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp.ok) {
            const copia = resp.clone();
            caches.open(PAGINAS).then((c) => c.put(req, copia));
          }
          return resp;
        })
        .catch(() => caches.match(req).then((salvo) => salvo || caches.match(OFFLINE))),
    );
  }
});

// Notificação que chega do servidor: { titulo, corpo, url, tag }. Toda mensagem vira notificação na tela
// (o iPhone desliga o push de quem recebe sem mostrar).
self.addEventListener("push", (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch {
    dados = { corpo: evento.data ? evento.data.text() : "" };
  }
  evento.waitUntil(
    self.registration.showNotification(dados.titulo || "Bolso", {
      body: dados.corpo || "",
      icon: "/icone-192.png",
      badge: "/icone-aviso.png",
      tag: dados.tag || "bolso",
      renotify: true,
      lang: "pt-BR",
      data: { url: dados.url || "/avisos" },
    }),
  );
});

// Tocar na notificação: usa a janela do app que já está aberta, senão abre uma
self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const url = new URL((evento.notification.data && evento.notification.data.url) || "/avisos", self.location.origin).href;
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      const janela = janelas.find((j) => new URL(j.url).origin === self.location.origin);
      if (!janela) return self.clients.openWindow(url);
      return janela
        .focus()
        .then((j) => (j.navigate ? j.navigate(url) : null))
        .catch(() => self.clients.openWindow(url));
    }),
  );
});
