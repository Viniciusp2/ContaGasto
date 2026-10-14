"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

// Telas onde o "+" faz sentido: onde a gente lança (decidido em 07/10/2026). Nas outras ele só atrapalhava a leitura.
const TELAS_COM_BOTAO = ["/", "/lancamentos"];

// Botão flutuante "+": no alcance do polegar, mas só no Início e em Lançamentos.
// Some enquanto a tela rola pra baixo (pra não cobrir valores) e volta ao rolar pra cima.
export function BotaoLancar() {
  const caminho = usePathname();
  const [escondido, setEscondido] = useState(false);

  useEffect(() => {
    let ultimo = window.scrollY;
    function aoRolar() {
      const atual = window.scrollY;
      if (Math.abs(atual - ultimo) < 8) return;
      setEscondido(atual > ultimo && atual > 80);
      ultimo = atual;
    }
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  if (!TELAS_COM_BOTAO.includes(caminho)) return null;

  return (
    <Link
      href="/lancamentos/novo"
      aria-label="Novo lançamento"
      tabIndex={escondido ? -1 : undefined}
      aria-hidden={escondido || undefined}
      className={`fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-full bg-coral text-tinta shadow-suave transition-all duration-200 active:scale-90 md:right-8 ${
        escondido ? "pointer-events-none translate-y-6 opacity-0" : "opacity-100"
      }`}
    >
      <Plus size={28} strokeWidth={2.5} aria-hidden />
    </Link>
  );
}
