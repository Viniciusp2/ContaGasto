"use client";

import { useActionState, useState, useTransition } from "react";
import { LoaderCircle, Search, Trash2 } from "lucide-react";
import { apagarDuplicados, procurarDuplicados, type EstadoDuplicados, type ParDuplicado } from "@/app/exportar/actions";
import { diaCurto } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";

// Dois passos: procurar (mostra os pares) e só então apagar os seus. O do extrato sempre fica.
export function ArrumarDuplicados() {
  const [pares, setPares] = useState<ParDuplicado[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [procurando, iniciar] = useTransition();
  const [estado, apagar, apagando] = useActionState(async (a: EstadoDuplicados, fd: FormData) => {
    const r = await apagarDuplicados(a, fd);
    if (r.ok) setPares(null);
    return r;
  }, {});

  function procurar() {
    iniciar(async () => {
      const r = await procurarDuplicados();
      setAviso(r.ok ?? null);
      setPares(r.pares ?? null);
      setMarcados(new Set((r.pares ?? []).map((p) => p.manual.id)));
    });
  }

  function alternar(id: string) {
    const novo = new Set(marcados);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    setMarcados(novo);
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={procurar}
        disabled={procurando}
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-lavanda px-4 font-semibold disabled:opacity-50"
      >
        {procurando ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <Search size={18} aria-hidden />}
        Procurar duplicados
      </button>

      {aviso && !pares && (
        <p role="status" className="rounded-2xl bg-menta px-3 py-2 text-sm font-semibold">
          {aviso}
        </p>
      )}
      {estado.ok && !pares && (
        <p role="status" className="rounded-2xl bg-menta px-3 py-2 text-sm font-semibold">
          {estado.ok}
        </p>
      )}
      {estado.erro && (
        <p role="alert" className="rounded-2xl bg-coral px-3 py-2 text-sm font-semibold">
          {estado.erro}
        </p>
      )}

      {pares && (
        <form action={apagar} className="flex flex-col gap-3">
          <p className="text-sm">
            Achei <strong>{pares.length}</strong> lançamento{pares.length === 1 ? "" : "s"} seu{pares.length === 1 ? "" : "s"} com um gêmeo vindo do
            extrato (mesmo valor, até 4 dias de diferença). Desmarque o que não for repetido.
          </p>
          <ul className="flex flex-col gap-2">
            {pares.map((p) => (
              <li key={p.manual.id}>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl bg-fundo p-3 text-sm">
                  <input
                    type="checkbox"
                    name="id"
                    value={p.manual.id}
                    checked={marcados.has(p.manual.id)}
                    onChange={() => alternar(p.manual.id)}
                    className="mt-0.5 size-5 shrink-0 accent-tinta"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2 font-semibold">
                      <span className="truncate">Apagar: {p.manual.descricao}</span>
                      <span className="shrink-0 tabular-nums">{formatarCentavos(p.manual.valor)}</span>
                    </span>
                    <span className="block text-xs text-tinta-suave">
                      {diaCurto(p.manual.data)} · fica o do extrato{p.extrato.contaNome ? ` ${p.extrato.contaNome}` : ""}: {p.extrato.descricao},{" "}
                      {diaCurto(p.extrato.data)}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="text-xs text-tinta-suave">Apagar não tem volta. Se quiser garantia, baixe um backup acima antes.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setPares(null)} className="min-h-11 rounded-2xl bg-fundo text-sm font-semibold">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={apagando || marcados.size === 0}
              className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-coral text-sm font-semibold disabled:opacity-50"
            >
              {apagando ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <Trash2 size={16} aria-hidden />}
              Apagar {marcados.size}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
