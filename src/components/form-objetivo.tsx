"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { apagarObjetivo, criarObjetivo, movimentarObjetivo, type EstadoObjetivo } from "@/app/objetivos/actions";
import { IconeCategoria } from "@/components/icone-categoria";
import { centavosDeDigitos, formatarCentavos } from "@/lib/dinheiro";
import { ICONES_OBJETIVO, type IconeObjetivo } from "@/lib/objetivos";

const campo = "min-h-11 w-full rounded-2xl bg-fundo px-4 outline-none focus:ring-2 focus:ring-lavanda";

export function NovoObjetivo() {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [icone, setIcone] = useState<IconeObjetivo>("PiggyBank");
  const [valorAlvo, setValorAlvo] = useState(0);
  const [dataAlvo, setDataAlvo] = useState("");
  const [estado, acao, salvando] = useActionState(async (anterior: EstadoObjetivo, fd: FormData) => {
    const r = await criarObjetivo(anterior, fd);
    if (r.ok) {
      setAberto(false);
      setNome("");
      setValorAlvo(0);
      setDataAlvo("");
      setIcone("PiggyBank");
    }
    return r;
  }, {});

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex min-h-14 items-center justify-center gap-2 rounded-card bg-coral font-semibold shadow-suave"
      >
        <Plus size={20} aria-hidden /> Novo objetivo
      </button>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-3 rounded-card bg-cartao p-4 shadow-suave">
      <input type="hidden" name="icone" value={icone} />
      <input type="hidden" name="valorAlvo" value={valorAlvo} />
      <label className="text-sm font-semibold">
        O que você quer juntar?
        <input
          name="nome"
          maxLength={40}
          placeholder="Celular novo, viagem..."
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className={`mt-1 font-normal ${campo}`}
        />
      </label>
      <div>
        <p className="mb-2 text-sm font-semibold">Ícone</p>
        <div className="grid grid-cols-5 gap-2">
          {ICONES_OBJETIVO.map((i) => (
            <button
              key={i}
              type="button"
              aria-label={i}
              aria-pressed={icone === i}
              onClick={() => setIcone(i)}
              className={`flex min-h-12 items-center justify-center rounded-2xl border-2 ${
                icone === i ? "border-tinta bg-lavanda" : "border-transparent bg-fundo"
              }`}
            >
              <IconeCategoria nome={i} size={22} />
            </button>
          ))}
        </div>
      </div>
      <label className="text-sm font-semibold">
        Quanto
        <input
          inputMode="numeric"
          value={formatarCentavos(valorAlvo)}
          onChange={(e) => setValorAlvo(centavosDeDigitos(e.target.value))}
          className={`mt-1 text-center text-2xl font-bold tabular-nums ${campo}`}
        />
      </label>
      <label className="text-sm font-semibold">
        Até quando
        <input
          name="dataAlvo"
          type="date"
          value={dataAlvo}
          onChange={(e) => setDataAlvo(e.target.value)}
          className={`mt-1 font-normal ${campo}`}
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
          disabled={salvando || !nome.trim() || valorAlvo <= 0 || !dataAlvo}
          className="min-h-12 rounded-2xl bg-coral font-semibold disabled:opacity-50"
        >
          Criar
        </button>
      </div>
    </form>
  );
}

// Guardar, resgatar ou apagar
export function AcoesObjetivo({ id, saldo, hoje }: { id: string; saldo: number; hoje: string }) {
  const [tipo, setTipo] = useState<"guardar" | "resgatar" | null>(null);
  const [valor, setValor] = useState(0);
  const [apagando, setApagando] = useState(false);
  const [estado, acao, salvando] = useActionState(async (anterior: EstadoObjetivo, fd: FormData) => {
    const r = await movimentarObjetivo(anterior, fd);
    if (r.ok) {
      setTipo(null);
      setValor(0);
    }
    return r;
  }, {});

  if (apagando) {
    return (
      <form action={apagarObjetivo.bind(null, id)} className="mt-3 flex items-center justify-end gap-2">
        <span className="text-sm">Apagar o objetivo e o histórico?</span>
        <button type="button" onClick={() => setApagando(false)} className="min-h-11 px-3 text-sm">
          Cancelar
        </button>
        <button type="submit" className="min-h-11 rounded-full bg-coral px-4 text-sm font-semibold">
          Apagar
        </button>
      </form>
    );
  }

  if (!tipo) {
    return (
      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={() => setTipo("guardar")} className="min-h-11 rounded-full bg-menta px-4 text-sm font-semibold">
          Guardar
        </button>
        {saldo > 0 && (
          <button type="button" onClick={() => setTipo("resgatar")} className="min-h-11 rounded-full bg-fundo px-4 text-sm font-semibold">
            Resgatar
          </button>
        )}
        <button
          type="button"
          aria-label="Apagar objetivo"
          onClick={() => setApagando(true)}
          className="ml-auto flex size-11 items-center justify-center text-tinta-suave"
        >
          <Trash2 size={18} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <form action={acao} className="mt-3 flex flex-col gap-2 rounded-2xl bg-fundo p-3">
      <input type="hidden" name="objetivoId" value={id} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="valor" value={valor} />
      <input type="hidden" name="data" value={hoje} />
      <label className="text-sm font-semibold">
        {tipo === "guardar" ? "Quanto vai guardar?" : `Quanto vai resgatar? (tem ${formatarCentavos(saldo)})`}
        <input
          inputMode="numeric"
          autoFocus
          value={formatarCentavos(valor)}
          onChange={(e) => setValor(centavosDeDigitos(e.target.value))}
          className="mt-1 min-h-11 w-full rounded-2xl bg-cartao px-3 text-center text-xl font-bold tabular-nums outline-none focus:ring-2 focus:ring-lavanda"
        />
      </label>
      {estado.erro && <p className="text-sm font-semibold">{estado.erro}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setTipo(null)} className="min-h-11 rounded-2xl bg-cartao text-sm font-semibold">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={salvando || valor <= 0}
          className={`min-h-11 rounded-2xl text-sm font-semibold disabled:opacity-50 ${tipo === "guardar" ? "bg-menta" : "bg-coral"}`}
        >
          {tipo === "guardar" ? "Guardar" : "Resgatar"}
        </button>
      </div>
    </form>
  );
}
