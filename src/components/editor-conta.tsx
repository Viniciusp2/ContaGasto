"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
import { apagarConta, criarConta, salvarSaldoConta, type EstadoConfig } from "@/app/configuracoes/actions";
import { SeloConta } from "@/components/selo-conta";
import { seloDoBanco } from "@/lib/bancos";
import { diaCurto } from "@/lib/datas";
import { centavosDeDigitos, formatarCentavos } from "@/lib/dinheiro";

type Conta = { id: string; nome: string; sigla: string; cor: string; corTexto: string };

// Informa o que o banco mostra hoje; daí pra frente o app soma os lançamentos desse banco
function FormSaldo({ id, nome, aoSalvar }: { id: string; nome: string; aoSalvar: () => void }) {
  const [centavos, setCentavos] = useState(0);
  const [negativo, setNegativo] = useState(false);
  const [estado, salvar, salvando] = useActionState(async (a: EstadoConfig, fd: FormData) => {
    const r = await salvarSaldoConta(a, fd);
    if (r.ok) aoSalvar();
    return r;
  }, {});
  return (
    <form action={salvar} className="flex flex-col gap-2 rounded-2xl bg-fundo p-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="saldo" value={centavos} />
      <input type="hidden" name="negativo" value={negativo ? "sim" : "nao"} />
      <label className="text-sm font-semibold">
        Quanto o {nome} mostra hoje
        <input
          inputMode="numeric"
          autoFocus
          value={(negativo ? "-" : "") + formatarCentavos(centavos)}
          onChange={(e) => setCentavos(centavosDeDigitos(e.target.value))}
          className="mt-1 min-h-11 w-full rounded-2xl bg-cartao px-3 text-lg font-bold tabular-nums outline-none focus:ring-2 focus:ring-lavanda"
        />
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={negativo} onChange={(e) => setNegativo(e.target.checked)} className="size-5 accent-tinta" />
        Está no vermelho (cheque especial)
      </label>
      {estado.erro && <p role="alert" className="rounded-2xl bg-coral px-3 py-2 text-sm">{estado.erro}</p>}
      <button type="submit" disabled={salvando} className="min-h-11 rounded-2xl bg-coral text-sm font-semibold disabled:opacity-50">
        Salvar saldo
      </button>
    </form>
  );
}

export function LinhaConta({
  conta,
  saldoAtual,
  saldoInformadoEm,
}: {
  conta: Conta;
  saldoAtual: number | null;
  saldoInformadoEm: string | null;
}) {
  const [estado, apagar, apagando] = useActionState(apagarConta, {});
  const [editandoSaldo, setEditandoSaldo] = useState(false);
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
      <div className="flex items-center justify-between gap-2 pl-1 text-sm">
        <span className="text-tinta-suave">
          {saldoAtual !== null ? (
            <>
              Hoje: <strong className="text-tinta tabular-nums">{formatarCentavos(saldoAtual)}</strong>
              {saldoInformadoEm && <span className="text-xs"> (informado {diaCurto(saldoInformadoEm)})</span>}
            </>
          ) : (
            "Saldo ainda não informado"
          )}
        </span>
        {!editandoSaldo && (
          <button type="button" onClick={() => setEditandoSaldo(true)} className="flex min-h-11 items-center gap-1 px-2 text-sm font-semibold underline">
            <Wallet size={14} aria-hidden /> {saldoAtual !== null ? "Acertar" : "Informar saldo"}
          </button>
        )}
      </div>
      {editandoSaldo && <FormSaldo id={conta.id} nome={conta.nome} aoSalvar={() => setEditandoSaldo(false)} />}
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
