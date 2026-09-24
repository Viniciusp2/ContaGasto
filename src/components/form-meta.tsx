"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { apagarMeta, salvarMeta, type EstadoMeta } from "@/app/metas/actions";
import { IconeCategoria } from "@/components/icone-categoria";
import { centavosDeDigitos, formatarCentavos } from "@/lib/dinheiro";

type Categoria = { id: string; nome: string; icone: string; cor: string };

const campo = "min-h-11 w-full rounded-2xl bg-fundo px-4 outline-none focus:ring-2 focus:ring-lavanda";

// Nova meta: escolhe a categoria e o limite do mês
export function NovaMeta({ categorias }: { categorias: Categoria[] }) {
  const [aberto, setAberto] = useState(false);
  const [categoriaId, setCategoriaId] = useState("");
  const [limite, setLimite] = useState(0);
  const [estado, acao, salvando] = useActionState(async (anterior: EstadoMeta, fd: FormData) => {
    const r = await salvarMeta(anterior, fd);
    if (r.ok) {
      setAberto(false);
      setCategoriaId("");
      setLimite(0);
    }
    return r;
  }, {});

  if (categorias.length === 0) return null;
  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex min-h-14 items-center justify-center gap-2 rounded-card bg-coral font-semibold shadow-suave"
      >
        <Plus size={20} aria-hidden /> Nova meta
      </button>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-3 rounded-card bg-cartao p-4 shadow-suave">
      <input type="hidden" name="categoriaId" value={categoriaId} />
      <input type="hidden" name="limite" value={limite} />
      <p className="text-sm font-semibold">Categoria</p>
      <div className="grid grid-cols-3 gap-2">
        {categorias.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={c.id === categoriaId}
            onClick={() => setCategoriaId(c.id)}
            style={c.id === categoriaId ? { backgroundColor: c.cor } : undefined}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 text-xs leading-tight ${
              c.id === categoriaId ? "sobre-pastel border-[#3a2e3f] font-semibold" : "border-transparent bg-fundo"
            }`}
          >
            <IconeCategoria nome={c.icone} size={20} />
            {c.nome}
          </button>
        ))}
      </div>
      <label className="text-sm font-semibold">
        Limite por mês
        <input
          inputMode="numeric"
          value={formatarCentavos(limite)}
          onChange={(e) => setLimite(centavosDeDigitos(e.target.value))}
          className={`mt-1 text-center text-2xl font-bold tabular-nums ${campo}`}
        />
      </label>
      {estado.erro && (
        <p role="alert" className="rounded-2xl bg-coral/30 px-4 py-3 text-sm font-semibold">
          {estado.erro}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAberto(false)} className="min-h-12 rounded-2xl bg-fundo font-semibold">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={salvando || !categoriaId || limite <= 0}
          className="min-h-12 rounded-2xl bg-coral font-semibold disabled:opacity-50"
        >
          Salvar
        </button>
      </div>
    </form>
  );
}

// Trocar o limite ou tirar a meta
export function EditarMeta({ id, categoriaId, limite }: { id: string; categoriaId: string; limite: number }) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(limite);
  const [estado, acao, salvando] = useActionState(async (anterior: EstadoMeta, fd: FormData) => {
    const r = await salvarMeta(anterior, fd);
    if (r.ok) setAberto(false);
    return r;
  }, {});

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="min-h-11 px-2 text-sm font-semibold text-tinta-suave underline">
        Mudar
      </button>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-fundo p-3">
      <form action={acao} className="flex items-center gap-2">
        <input type="hidden" name="categoriaId" value={categoriaId} />
        <input type="hidden" name="limite" value={valor} />
        <input
          aria-label="Novo limite"
          inputMode="numeric"
          value={formatarCentavos(valor)}
          onChange={(e) => setValor(centavosDeDigitos(e.target.value))}
          className="min-h-11 min-w-0 flex-1 rounded-2xl bg-cartao px-3 text-right font-semibold tabular-nums outline-none focus:ring-2 focus:ring-lavanda"
        />
        <button type="submit" disabled={salvando || valor <= 0} className="min-h-11 rounded-full bg-coral px-4 text-sm font-semibold disabled:opacity-50">
          Salvar
        </button>
      </form>
      {estado.erro && <p className="text-sm font-semibold">{estado.erro}</p>}
      <div className="flex justify-between">
        <button type="button" onClick={() => setAberto(false)} className="min-h-11 text-sm">
          Cancelar
        </button>
        <form action={apagarMeta.bind(null, id)}>
          <button type="submit" className="flex min-h-11 items-center gap-1 text-sm text-tinta-suave">
            <Trash2 size={16} aria-hidden /> Tirar meta
          </button>
        </form>
      </div>
    </div>
  );
}
