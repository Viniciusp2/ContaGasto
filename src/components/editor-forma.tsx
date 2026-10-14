"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { apagarForma, salvarForma, type EstadoConfig } from "@/app/configuracoes/actions";
import { TIPOS_FORMA, type TipoForma } from "@/lib/categorias";

const campo = "min-h-11 w-full rounded-2xl bg-cartao px-3 outline-none focus:ring-2 focus:ring-lavanda";

export function NovaForma() {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoForma>("credito");
  const [estado, acao, salvando] = useActionState(async (anterior: EstadoConfig, fd: FormData) => {
    const r = await salvarForma(anterior, fd);
    if (r.ok) {
      setAberto(false);
      setNome("");
    }
    return r;
  }, {});

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-lavanda text-sm font-semibold">
        <Plus size={16} aria-hidden /> Nova forma de pagamento
      </button>
    );
  }
  return (
    <form action={acao} className="flex flex-col gap-3 rounded-2xl bg-fundo p-3">
      <input type="hidden" name="tipo" value={tipo} />
      <label className="text-sm font-semibold">
        Nome
        <input name="nome" required maxLength={30} placeholder="Nubank, Cartão Inter..." value={nome} onChange={(e) => setNome(e.target.value)} className={`mt-1 font-normal ${campo}`} />
      </label>
      <div role="radiogroup" aria-label="Tipo" className="flex flex-wrap gap-2">
        {TIPOS_FORMA.map((t) => (
          <button
            key={t.valor}
            type="button"
            role="radio"
            aria-checked={tipo === t.valor}
            onClick={() => setTipo(t.valor)}
            className={`min-h-11 rounded-full px-4 text-sm ${tipo === t.valor ? "bg-lavanda font-semibold" : "bg-cartao"}`}
          >
            {t.rotulo}
          </button>
        ))}
      </div>
      {tipo === "credito" && <p className="text-xs text-tinta-suave">Depois configure o fechamento e o vencimento em Cartões.</p>}
      {estado.erro && <p role="alert" className="rounded-2xl bg-coral px-3 py-2 text-sm font-semibold">{estado.erro}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAberto(false)} className="min-h-11 rounded-2xl bg-cartao text-sm font-semibold">
          Cancelar
        </button>
        <button type="submit" disabled={salvando || !nome.trim()} className="min-h-11 rounded-2xl bg-coral text-sm font-semibold disabled:opacity-50">
          Criar
        </button>
      </div>
    </form>
  );
}

// Renomear ou apagar (apagar só se nunca foi usada)
export function LinhaForma({ id, nome, tipoRotulo, doSistema }: { id: string; nome: string; tipoRotulo: string; doSistema: boolean }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nome);
  const [estadoSalvar, salvar, salvando] = useActionState(async (anterior: EstadoConfig, fd: FormData) => {
    const r = await salvarForma(anterior, fd);
    if (r.ok) setEditando(false);
    return r;
  }, {});
  const [estadoApagar, apagar, apagando] = useActionState(apagarForma, {});

  return (
    <li className="flex flex-col gap-2 py-2">
      {editando ? (
        <form action={salvar} className="flex items-center gap-2">
          <input type="hidden" name="id" value={id} />
          <input aria-label="Nome da forma" name="nome" maxLength={30} value={valor} onChange={(e) => setValor(e.target.value)} className={`min-w-0 flex-1 ${campo}`} />
          <button type="submit" disabled={salvando} className="min-h-11 rounded-full bg-coral px-4 text-sm font-semibold">
            Salvar
          </button>
          <button type="button" onClick={() => setEditando(false)} className="min-h-11 px-2 text-sm">
            Cancelar
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{nome}</span>
            <span className="block text-xs text-tinta-suave">{tipoRotulo}</span>
          </span>
          {!doSistema && (
            <>
              <button type="button" onClick={() => setEditando(true)} className="min-h-11 px-3 text-sm font-semibold text-tinta-suave underline">
                Renomear
              </button>
              <form action={apagar}>
                <input type="hidden" name="id" value={id} />
                <button type="submit" disabled={apagando} aria-label={`Apagar ${nome}`} className="flex size-11 items-center justify-center text-tinta-suave">
                  <Trash2 size={16} aria-hidden />
                </button>
              </form>
            </>
          )}
        </div>
      )}
      {(estadoSalvar.erro || estadoApagar.erro) && (
        <p role="alert" className="rounded-2xl bg-coral px-3 py-2 text-sm">{estadoSalvar.erro ?? estadoApagar.erro}</p>
      )}
    </li>
  );
}
