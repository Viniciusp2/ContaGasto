"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import type { EstadoConferir } from "@/app/conferir/actions";
import { salvarSaldoConta, type EstadoConfig } from "@/app/configuracoes/actions";
import { SeloConta } from "@/components/selo-conta";
import { diferencaDoBanco } from "@/lib/conferir";
import { centavosDeDigitos, formatarCentavos } from "@/lib/dinheiro";

type Acao = (estado: EstadoConferir, fd: FormData) => Promise<EstadoConferir>;

// Botão de uma ação da Conferir (juntar, apagar, está certo), com o resultado logo abaixo
export function BotaoAcao({ acao, campos, rotulo, forte = false }: { acao: Acao; campos: Record<string, string>; rotulo: string; forte?: boolean }) {
  const [estado, agir, agindo] = useActionState(acao, {});
  if (estado.ok) return <p className="rounded-2xl bg-menta px-3 py-2 text-sm font-semibold">{estado.ok}</p>;
  return (
    <form action={agir} className="flex flex-col gap-1">
      {Object.entries(campos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}
      <button
        type="submit"
        disabled={agindo}
        className={`flex min-h-11 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-semibold disabled:opacity-50 ${forte ? "bg-coral" : "bg-fundo"}`}
      >
        {agindo && <LoaderCircle size={16} className="animate-spin" aria-hidden />}
        {rotulo}
      </button>
      {estado.erro && (
        <p role="alert" className="text-sm font-semibold">
          {estado.erro}
        </p>
      )}
    </form>
  );
}

type Banco = { id: string; nome: string; sigla: string; cor: string; corTexto: string; saldo: number | null };

// "Bate com o banco?": você digita o que o app do banco mostra; a diferença aparece na hora.
// Se a diferença for de algo que você não vai lançar, dá pra acertar o app pro valor do banco.
export function BateComBanco({ banco }: { banco: Banco }) {
  const [centavos, setCentavos] = useState(0);
  const [negativo, setNegativo] = useState(false);
  const [estado, acertar, acertando] = useActionState(salvarSaldoConta, {} as EstadoConfig);
  const digitado = negativo ? -centavos : centavos;
  const dif = banco.saldo === null ? null : diferencaDoBanco(banco.saldo, digitado);

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-fundo p-3">
      <p className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 font-semibold">
          <SeloConta nome={banco.nome} sigla={banco.sigla} cor={banco.cor} corTexto={banco.corTexto} /> {banco.nome}
        </span>
        <span className="text-tinta-suave">
          No app: <strong className="text-tinta tabular-nums">{banco.saldo !== null ? formatarCentavos(banco.saldo) : "sem saldo informado"}</strong>
        </span>
      </p>
      <label className="text-xs font-semibold">
        O app do {banco.nome} mostra
        <input
          inputMode="numeric"
          value={(negativo ? "-" : "") + formatarCentavos(centavos)}
          onChange={(e) => setCentavos(centavosDeDigitos(e.target.value))}
          className="mt-1 min-h-11 w-full rounded-2xl bg-cartao px-3 text-base font-bold tabular-nums outline-none focus:ring-2 focus:ring-lavanda"
        />
      </label>
      <label className="flex min-h-11 items-center gap-2 text-xs">
        <input type="checkbox" checked={negativo} onChange={(e) => setNegativo(e.target.checked)} className="size-5 accent-tinta" /> No vermelho
      </label>
      {centavos > 0 && dif !== null && (
        <p className={`rounded-2xl px-3 py-2 text-sm font-semibold ${dif === 0 ? "bg-menta" : "bg-limao"}`}>
          {dif === 0
            ? "Bate certinho."
            : dif > 0
              ? `O banco tem ${formatarCentavos(dif)} a mais que o app: pode ser uma entrada que não foi lançada, ou um gasto lançado em dobro ou no banco errado.`
              : `O banco tem ${formatarCentavos(-dif)} a menos que o app: pode ser um gasto que não foi lançado (ou foi sem banco), ou uma entrada em dobro.`}
        </p>
      )}
      {centavos > 0 && dif !== 0 && (
        <form action={acertar}>
          <input type="hidden" name="id" value={banco.id} />
          <input type="hidden" name="saldo" value={centavos} />
          <input type="hidden" name="negativo" value={negativo ? "sim" : "nao"} />
          <button type="submit" disabled={acertando} className="min-h-11 w-full rounded-2xl bg-cartao text-sm font-semibold underline disabled:opacity-50">
            Já conferi: acertar o app pra {(negativo ? "-" : "") + formatarCentavos(centavos)}
          </button>
          {estado.erro && <p className="text-sm font-semibold">{estado.erro}</p>}
          {estado.ok && <p className="text-sm font-semibold">Acertado.</p>}
        </form>
      )}
    </div>
  );
}
