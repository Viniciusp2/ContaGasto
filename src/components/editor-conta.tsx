"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { apagarConta, criarConta, type EstadoConfig } from "@/app/configuracoes/actions";
import { SeloConta } from "@/components/selo-conta";
import { seloDoBanco } from "@/lib/bancos";

type Conta = { id: string; nome: string; sigla: string; cor: string; corTexto: string };

export function LinhaConta({ conta }: { conta: Conta }) {
  const [estado, apagar, apagando] = useActionState(apagarConta, {});
  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex items-center gap-3">
        <SeloConta nome={conta.nome} sigla={conta.sigla} cor={conta.cor} corTexto={conta.corTexto} />
        <span className="flex-1 font-semibold">{conta.nome}</span>
        <form action={apagar}>
          <input type="hidden" name="id" value={conta.id} />
          <button type="submit" disabled={apagando} aria-label={`Apagar ${conta.nome}`} className="flex size-11 items-center justify-center text-tinta-suave">
            <Trash2 size={16} aria-hidden />
          </button>
        </form>
      </div>
      {estado.erro && <p role="alert" className="rounded-2xl bg-coral px-3 py-2 text-sm">{estado.erro}</p>}
    </li>
  );
}

// O selo aparece enquanto digita: banco conhecido já vem com a cor dele
export function NovaConta() {
  const [nome, setNome] = useState("");
  const [estado, acao, salvando] = useActionState(async (a: EstadoConfig, fd: FormData) => {
    const r = await criarConta(a, fd);
    if (r.ok) setNome("");
    return r;
  }, {});
  const selo = seloDoBanco(nome || "?");
  return (
    <form action={acao} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {nome.trim() && <SeloConta nome={nome} sigla={selo.sigla} cor={selo.cor} corTexto={selo.corTexto} />}
        <input
          name="nome"
          maxLength={30}
          placeholder="Nubank, Inter, Dinheiro..."
          aria-label="Nome do banco"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-2xl bg-fundo px-3 outline-none focus:ring-2 focus:ring-lavanda"
        />
        <button type="submit" disabled={salvando || !nome.trim()} aria-label="Adicionar banco" className="flex size-11 items-center justify-center rounded-full bg-coral disabled:opacity-50">
          <Plus size={18} aria-hidden />
        </button>
      </div>
      {estado.erro && <p role="alert" className="rounded-2xl bg-coral px-3 py-2 text-sm">{estado.erro}</p>}
    </form>
  );
}
