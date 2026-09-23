"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

// Botão flutuante "+": sempre visível, no alcance do polegar.
// Some nas telas de formulário, onde cobriria o botão de salvar.
export function BotaoLancar() {
  const caminho = usePathname();
  if (caminho === "/lancamentos/novo" || caminho.endsWith("/editar")) return null;

  return (
    <Link
      href="/lancamentos/novo"
      aria-label="Novo lançamento"
      className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-full bg-coral text-tinta shadow-suave transition-transform active:scale-90 md:right-8"
    >
      <Plus size={28} strokeWidth={2.5} aria-hidden />
    </Link>
  );
}
