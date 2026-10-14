"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { apagarLancamento } from "@/app/lancamentos/actions";

// Apagar em dois toques: o primeiro pede confirmação, o segundo apaga de vez
export function BotaoApagar({ id, mes }: { id: string; mes: string }) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-card text-sm font-semibold text-tinta-suave"
      >
        <Trash2 size={18} aria-hidden /> Apagar lançamento
      </button>
    );
  }

  return (
    <form action={apagarLancamento.bind(null, id, mes)} className="flex flex-col gap-2 rounded-card bg-coral/30 p-3">
      <p className="text-center text-sm font-semibold">Apagar de vez? Não dá pra desfazer.</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="min-h-11 rounded-2xl bg-cartao font-semibold"
        >
          Cancelar
        </button>
        <button type="submit" className="min-h-11 rounded-2xl bg-coral font-semibold">
          Apagar
        </button>
      </div>
    </form>
  );
}
