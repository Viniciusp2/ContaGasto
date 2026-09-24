// Service worker do Bolso: offline básico (Sprint 4.2).
// - Arquivos do build (/_next/static) são imutáveis: cache primeiro.
// - Páginas: rede primeiro; sem internet, mostra a última versão vista ou a página "Sem internet".
// - Nada que grava (POST, server actions) passa pelo cache.
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
