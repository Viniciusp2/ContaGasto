"use client";

import { useEffect, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { inscreverAparelho } from "@/app/avisos/actions";

const SINCRONIZADO = "bolso-push-sincronizado";

// Uma vez por dia confirma no servidor a inscrição deste aparelho (o navegador pode trocá-la sozinho)
async function sincronizarNotificacao(reg: ServiceWorkerRegistration) {
  if (!("PushManager" in window) || !("Notification" in window) || Notification.permission !== "granted") return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const hoje = new Date().toISOString().slice(0, 10);
  try {
    if (localStorage.getItem(SINCRONIZADO) === hoje) return;
  } catch {}
  const r = await inscreverAparelho(sub.toJSON());
  try {
    if (r.ok) localStorage.setItem(SINCRONIZADO, hoje);
  } catch {}
}

// Registra o service worker (só em produção: no next dev ele atrapalharia o recarregamento)
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(sincronizarNotificacao)
      .catch(() => {});
  }, []);
  return null;
}

const assinar = (avisar: () => void) => {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
};

// Aviso quando cai a internet: o que aparece é a última versão guardada
export function AvisoOffline() {
  const online = useSyncExternalStore(assinar, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-limao px-4 py-2 text-sm font-semibold">
      <WifiOff size={16} aria-hidden /> Sem internet: mostrando a última versão salva
    </div>
  );
}
