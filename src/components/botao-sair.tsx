"use client";

import { LogOut } from "lucide-react";
import { sair } from "@/app/entrar/actions";

// Sai e apaga as páginas guardadas pro offline, pra ninguém ver os dados sem senha
export function BotaoSair() {
  async function sairDeVez() {
    await sair();
    if ("caches" in window) {
      const nomes = await caches.keys();
      await Promise.all(nomes.map((n) => caches.delete(n)));
    }
    // Recarrega tudo (não a navegação do Next), pra não sobrar dado na memória
    window.location.replace(new URL("/entrar", window.location.origin).href);
  }
  return (
    <button
      type="button"
      onClick={sairDeVez}
      className="flex min-h-12 items-center justify-center gap-2 rounded-card bg-cartao font-semibold shadow-suave"
    >
      <LogOut size={18} aria-hidden /> Sair
    </button>
  );
}
