"use client";

import { motion } from "motion/react";

// Barra das metas e objetivos. Cor por estado, nunca só a cor: o texto ao lado diz o mesmo.
// Enche ao aparecer (quem pediu menos movimento vê ela já cheia).
const cores = {
  ok: "bg-[var(--barra-ok)]",
  atencao: "bg-[var(--barra-atencao)]",
  estourou: "bg-[var(--barra-estourou)]",
  neutro: "bg-lavanda",
} as const;

export function BarraProgresso({
  fracao,
  estado,
  rotulo,
}: {
  fracao: number;
  estado: keyof typeof cores;
  rotulo: string;
}) {
  const largura = Math.min(Math.max(fracao, 0), 1) * 100;
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fracao * 100)}
      className="h-3 overflow-hidden rounded-full bg-fundo"
    >
      <motion.div
        className={`h-full rounded-full ${cores[estado]}`}
        initial={{ width: 0 }}
        animate={{ width: `${largura}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}
