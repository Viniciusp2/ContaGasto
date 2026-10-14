"use client";

import { useActionState } from "react";
import { CreditCard } from "lucide-react";
import { salvarCartao, type EstadoCartao } from "@/app/cartoes/actions";

const campo =
  "min-h-11 w-full rounded-2xl bg-fundo px-3 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-lavanda";

export function FormCartao({
  id,
  nome,
  diaFechamento,
  diaVencimento,
}: {
  id: string;
  nome: string;
  diaFechamento: number | null;
  diaVencimento: number | null;
}) {
  const [estado, acao, salvando] = useActionState(salvarCartao, {} as EstadoCartao);

  return (
    <form action={acao} className="flex flex-col gap-3 rounded-card bg-cartao p-4 shadow-suave">
      <input type="hidden" name="id" value={id} />
      <h2 className="flex items-center gap-2 font-semibold">
        <CreditCard size={20} aria-hidden /> {nome}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Fecha dia
          <input
            name="diaFechamento"
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            defaultValue={diaFechamento ?? ""}
            className={`mt-1 ${campo}`}
          />
        </label>
        <label className="text-sm">
          Vence dia
          <input
            name="diaVencimento"
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            defaultValue={diaVencimento ?? ""}
            className={`mt-1 ${campo}`}
          />
        </label>
      </div>
      {estado.erro && (
        <p role="alert" className="rounded-2xl bg-coral/30 px-3 py-2 text-sm font-semibold">
          {estado.erro}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="rounded-2xl bg-menta px-3 py-2 text-sm font-semibold">
          Salvo. Vale pras próximas compras.
        </p>
      )}
      <button
        type="submit"
        disabled={salvando}
        className="min-h-11 rounded-2xl bg-lavanda font-semibold disabled:opacity-50"
      >
        Salvar
      </button>
    </form>
  );
}
