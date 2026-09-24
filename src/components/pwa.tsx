"use client";

import { useEffect, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

// Registra o service worker (só em produção: no next dev ele atrapalharia o recarregamento)
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
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
