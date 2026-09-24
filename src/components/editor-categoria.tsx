"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { salvarCategoria, type EstadoConfig } from "@/app/configuracoes/actions";
import { IconeCategoria } from "@/components/icone-categoria";
import { CORES_CATEGORIA, ICONES_CATEGORIA } from "@/lib/categorias";

type Categoria = { id: string; nome: string; icone: string; cor: string; tipo: "gasto" | "entrada"; protegida: boolean };

// Um editor serve pra criar (sem categoria) e pra editar
export function EditorCategoria({ categoria, tipoNovo }: { categoria?: Categoria; tipoNovo?: "gasto" | "entrada" }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState(categoria?.nome ?? "");
  const [icone, setIcone] = useState(categoria?.icone ?? "Package");
  const [cor, setCor] = useState(categoria?.cor ?? CORES_CATEGORIA[0]);
  const [estado, acao, salvando] = useActionState(async (anterior: EstadoConfig, fd: FormData) => {
    const r = await salvarCategoria(anterior, fd);
    if (r.ok) {
      setAberto(false);
      if (!categoria) {
        setNome("");
        setIcone("Package");
      }
    }
    return r;
  }, {});

  if (!aberto) {
    return categoria ? (
      <button type="button" onClick={() => setAberto(true)} aria-label={`Editar ${categoria.nome}`} className="flex size-11 items-center justify-center rounded-full text-tinta-suave">
        <Pencil size={16} aria-hidden />
      </button>
    ) : (
      <button type="button" onClick={() => setAberto(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-lavanda text-sm font-semibold">
        <Plus size={16} aria-hidden /> Nova categoria de {tipoNovo}
      </button>
    );
  }

  return (
    <form action={acao} className="col-span-full flex flex-col gap-3 rounded-2xl bg-fundo p-3">
      {categoria && <input type="hidden" name="id" value={categoria.id} />}
      <input type="hidden" name="tipo" value={categoria?.tipo ?? tipoNovo} />
      <input type="hidden" name="icone" value={icone} />
      <input type="hidden" name="cor" value={cor} />

      <div className="flex items-center gap-3">
        <span className="sobre-pastel flex size-12 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: cor }} aria-hidden>
          <IconeCategoria nome={icone} size={22} />
        </span>
        <label className="flex-1 text-sm font-semibold">
          Nome
          <input
            name="nome"
            maxLength={30}
            required
            value={nome}
            readOnly={categoria?.protegida}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-2xl bg-cartao px-3 font-normal outline-none focus:ring-2 focus:ring-lavanda read-only:opacity-70"
          />
        </label>
      </div>
      {categoria?.protegida && <p className="text-xs text-tinta-suave">O app usa esse nome, então só dá pra trocar o ícone e a cor.</p>}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Ícone</legend>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
          {ICONES_CATEGORIA.map((i) => (
            <button
              key={i}
              type="button"
              aria-label={i}
              aria-pressed={icone === i}
              onClick={() => setIcone(i)}
              className={`flex aspect-square min-h-11 items-center justify-center rounded-xl ${icone === i ? "bg-lavanda ring-2 ring-tinta" : "bg-cartao"}`}
            >
              <IconeCategoria nome={i} size={18} />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Cor</legend>
        <div className="flex flex-wrap gap-2">
          {CORES_CATEGORIA.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Cor ${c}`}
              aria-pressed={cor === c}
              onClick={() => setCor(c)}
              className={`size-11 rounded-full ${cor === c ? "ring-2 ring-tinta ring-offset-2 ring-offset-fundo" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </fieldset>

      {estado.erro && (
        <p role="alert" className="rounded-2xl bg-coral px-3 py-2 text-sm font-semibold">
          {estado.erro}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAberto(false)} className="min-h-11 rounded-2xl bg-cartao text-sm font-semibold">
          Cancelar
        </button>
        <button type="submit" disabled={salvando || !nome.trim()} className="min-h-11 rounded-2xl bg-coral text-sm font-semibold disabled:opacity-50">
          Salvar
        </button>
      </div>
    </form>
  );
}
