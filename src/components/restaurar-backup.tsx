"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";
import { restaurarBackup, type EstadoRestaurar } from "@/app/exportar/actions";

export function RestaurarBackup() {
  const [estado, acao, restaurando] = useActionState(restaurarBackup, {} as EstadoRestaurar);
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="min-h-11 text-sm font-semibold text-tinta-suave underline">
        Restaurar um backup
      </button>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-3 rounded-2xl bg-fundo p-3">
      <p className="rounded-2xl bg-coral px-3 py-2 text-sm font-semibold">
        Restaurar apaga tudo o que está no app agora e põe o backup no lugar. Baixe um backup antes, por garantia.
      </p>
      <label className="text-sm font-semibold">
        Arquivo de backup
        <input name="arquivo" type="file" accept="application/json,.json" required className="mt-1 block w-full text-sm" />
      </label>
      <label className="text-sm font-semibold">
        Digite RESTAURAR pra confirmar
        <input
          name="confirmacao"
          autoComplete="off"
          className="mt-1 min-h-11 w-full rounded-2xl bg-cartao px-3 outline-none focus:ring-2 focus:ring-lavanda"
        />
      </label>
      {estado.erro && (
        <p role="alert" className="text-sm font-semibold">
          {estado.erro}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="rounded-2xl bg-menta px-3 py-2 text-sm font-semibold">
          {estado.ok}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAberto(false)} className="min-h-11 rounded-2xl bg-cartao text-sm font-semibold">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={restaurando}
          className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-coral text-sm font-semibold disabled:opacity-50"
        >
          <Upload size={16} aria-hidden /> Restaurar
        </button>
      </div>
    </form>
  );
}
