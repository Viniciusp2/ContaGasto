"use client";

import { useState } from "react";
import { encerrarRecorrencia } from "@/app/fixos/actions";

// Dois toques, como o apagar: o primeiro pede confirmação
export function BotaoEncerrar({ id }: { id: string }) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="min-h-11 rounded-full bg-fundo px-4 text-sm font-semibold"
      >
        Encerrar
      </button>
    );
  }

  return (
    <form action={encerrarRecorrencia.bind(null, id)} className="flex items-center gap-2">
      <button type="button" onClick={() => setConfirmando(false)} className="min-h-11 px-3 text-sm">
        Cancelar
      </button>
      <button type="submit" className="min-h-11 rounded-full bg-coral px-4 text-sm font-semibold">
        Encerrar mesmo
      </button>
    </form>
  );
}
