"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, MotionConfig, animate, motion, useReducedMotion } from "motion/react";
import { formatarCentavos } from "@/lib/dinheiro";

// Quem pediu "reduzir movimento" no celular vê tudo parado (CLAUDE.md: animado, mas sóbrio)
export function ProvedorMovimento({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

// Número que "conta" até o valor. Começa do valor anterior, então trocar de mês também anima.
export function NumeroAnimado({ centavos }: { centavos: number }) {
  const reduzir = useReducedMotion();
  const [mostrado, setMostrado] = useState(reduzir ? centavos : 0);
  const anterior = useRef(reduzir ? centavos : 0);

  useEffect(() => {
    if (reduzir) {
      anterior.current = centavos;
      return;
    }
    const controle = animate(anterior.current, centavos, {
      duration: 0.7,
      ease: "easeOut",
      onUpdate: (v) => setMostrado(Math.round(v)),
    });
    anterior.current = centavos;
    return () => controle.stop();
  }, [centavos, reduzir]);

  // Leitores de tela recebem o valor final direto
  return (
    <>
      <span aria-hidden>{formatarCentavos(reduzir ? centavos : mostrado)}</span>
      <span className="sr-only">{formatarCentavos(centavos)}</span>
    </>
  );
}

const MENSAGENS: Record<string, string> = {
  gasto: "Gasto salvo",
  entrada: "Entrada salva",
  editado: "Alterações salvas",
  fixo: "Pronto, vai repetir sozinho",
};

// Check animado depois de salvar (a action manda ?salvo=...). Some sozinho e limpa a URL.
export function AvisoSalvo() {
  const params = useSearchParams();
  const router = useRouter();
  const caminho = usePathname();
  const salvo = params.get("salvo");
  const [visivel, setVisivel] = useState(Boolean(salvo));
  const [mensagem, setMensagem] = useState(salvo ? MENSAGENS[salvo] : null);

  // Novo ?salvo= na URL: mostra de novo (ajuste de estado durante o render, sem effect)
  const [ultimo, setUltimo] = useState(salvo);
  if (salvo !== ultimo) {
    setUltimo(salvo);
    if (salvo) {
      setMensagem(MENSAGENS[salvo] ?? "Salvo");
      setVisivel(true);
    }
  }

  useEffect(() => {
    if (!salvo) return;
    const t = setTimeout(() => {
      setVisivel(false);
      const resto = new URLSearchParams(params.toString());
      resto.delete("salvo");
      const q = resto.toString();
      router.replace(q ? `${caminho}?${q}` : caminho, { scroll: false });
    }, 2200);
    return () => clearTimeout(t);
  }, [salvo, params, router, caminho]);

  return (
    <AnimatePresence>
      {visivel && mensagem && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="fixed inset-x-0 top-4 z-40 mx-auto flex w-fit items-center gap-2 rounded-full bg-cartao py-2 pr-4 pl-2 font-semibold shadow-suave"
        >
          <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
            <circle cx="14" cy="14" r="14" fill="var(--menta)" />
            <motion.path
              d="M8 14.5 l4 4 l8 -9"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, delay: 0.1 }}
            />
          </svg>
          {mensagem}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
