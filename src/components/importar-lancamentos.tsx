"use client";

import { useActionState } from "react";
import { FileUp, LoaderCircle } from "lucide-react";
import { importarLancamentos, type EstadoImportar } from "@/app/exportar/actions";

// Adiciona lançamentos de um arquivo de importação. Não apaga nada; o que já existe fica de fora.
export function ImportarLancamentos() {
  const [estado, acao, importando] = useActionState(importarLancamentos, {} as EstadoImportar);
  return (
    <form action={acao} className="flex flex-col gap-3">
      <label className="text-sm font-semibold">
        Arquivo de importação (.json)
        <input name="arquivo" type="file" accept="application/json,.json" required className="mt-1 block w-full text-sm" />
      </label>
      {estado.erro && (
        <p role="alert" className="rounded-2xl bg-coral px-3 py-2 text-sm font-semibold">
          {estado.erro}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="rounded-2xl bg-menta px-3 py-2 text-sm font-semibold">
          {estado.ok}
        </p>
      )}
      <button
        type="submit"
        disabled={importando}
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-lavanda px-4 font-semibold disabled:opacity-50"
      >
        {importando ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <FileUp size={18} aria-hidden />}
        Importar
      </button>
    </form>
  );
}
