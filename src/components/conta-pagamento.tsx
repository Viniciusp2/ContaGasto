"use client";

import { useActionState, useState } from "react";
import { Check, LoaderCircle, Undo2 } from "lucide-react";
import { desfazerPagamento, pagar, type EstadoPagamento } from "@/app/pagamentos/actions";
import { IconeCategoria } from "@/components/icone-categoria";
import { SeloConta } from "@/components/selo-conta";
import type { ContaDoMes } from "@/db/pagamentos";
import { situacaoConta, textoVencimento } from "@/lib/contas";
import { diaCurto } from "@/lib/datas";
import { centavosDeDigitos, formatarCentavos } from "@/lib/dinheiro";

const pilula = {
  paga: "bg-menta",
  atrasada: "bg-coral",
  vence_hoje: "bg-limao",
  a_pagar: "bg-fundo",
} as const;

// Campos que dizem qual conta é (lançamento, ocorrência ainda não lançada ou fatura)
function CamposConta({ conta }: { conta: ContaDoMes }) {
  return (
    <>
      <input type="hidden" name="origem" value={conta.origem} />
      {conta.lancamentoId && <input type="hidden" name="lancamentoId" value={conta.lancamentoId} />}
      {conta.recorrenciaId && <input type="hidden" name="recorrenciaId" value={conta.recorrenciaId} />}
      {conta.competencia && <input type="hidden" name="competencia" value={conta.competencia} />}
      {conta.formaId && <input type="hidden" name="formaId" value={conta.formaId} />}
    </>
  );
}

type Banco = { id: string; nome: string; sigla: string; cor: string; corTexto: string };

export function ContaPagamento({
  conta,
  hoje,
  compacta = false,
  bancos = [],
  bancoPadrao = null,
}: {
  conta: ContaDoMes;
  hoje: string;
  compacta?: boolean;
  bancos?: Banco[]; // bancos de onde a conta pode ter saído (sem o do VA)
  bancoPadrao?: string | null; // último banco usado
}) {
  const [detalhes, setDetalhes] = useState(false);
  // Banco já marcado: o da conta (ou do fixo), senão o último usado, senão o único que existir (conserto 1.6.7)
  const sugerido = [conta.contaId, bancoPadrao].find((id) => id && bancos.some((b) => b.id === id)) ?? (bancos.length === 1 ? bancos[0].id : "");
  const [bancoId, setBancoId] = useState(sugerido ?? "");
  const [valor, setValor] = useState(conta.valor);
  const [pagoEm, setPagoEm] = useState(hoje);
  const [estadoPagar, acaoPagar, pagando] = useActionState(async (a: EstadoPagamento, fd: FormData) => {
    const r = await pagar(a, fd);
    if (r.ok) setDetalhes(false);
    return r;
  }, {});
  const [estadoDesfazer, acaoDesfazer, desfazendo] = useActionState(desfazerPagamento, {});

  const situacao = situacaoConta(conta.paga, conta.vencimento, hoje);
  const textoSituacao = conta.paga
    ? conta.automatico
      ? "débito automático"
      : conta.pagoEm
        ? `paga ${diaCurto(conta.pagoEm)}`
        : "paga"
    : conta.automatico
      ? `sai sozinha ${diaCurto(conta.vencimento)}`
      : textoVencimento(conta.vencimento, hoje);
  // Conta de valor que muda precisa do valor real antes de pagar
  const precisaValor = conta.estimado;
  const podeDesfazer = conta.paga && !conta.automatico && conta.origem !== "prevista";
  const erro = estadoPagar.erro ?? estadoDesfazer.erro;

  return (
    <li className={`rounded-card bg-cartao p-3 shadow-suave ${conta.paga ? "opacity-80" : ""}`}>
      <div className="flex items-center gap-3">
        <span
          className="sobre-pastel flex size-11 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: conta.cor ?? "var(--color-lavanda)" }}
          aria-hidden
        >
          <IconeCategoria nome={conta.icone} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{conta.descricao}</span>
          <span className="block truncate text-sm text-tinta-suave">
            {[conta.tipoRotulo, `vence ${diaCurto(conta.vencimento)}`, compacta ? null : conta.duracao].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-bold tabular-nums">
            {formatarCentavos(conta.valor)}
            {conta.estimado && <span className="sr-only"> (estimado)</span>}
          </span>
          <span className={`mt-0.5 inline-block rounded-full px-2 text-xs font-semibold ${pilula[situacao]}`}>
            {conta.estimado && !conta.paga ? "estimado · " : ""}
            {textoSituacao}
          </span>
        </span>
      </div>

      {!conta.paga && !conta.automatico && (
        <form action={acaoPagar} className="mt-3 flex flex-col gap-2">
          <CamposConta conta={conta} />
          {(detalhes || precisaValor) && (
            <div className="grid grid-cols-2 gap-2">
              {precisaValor && (
                <label className="text-xs font-semibold">
                  Quanto veio
                  <input
                    inputMode="numeric"
                    value={formatarCentavos(valor)}
                    onChange={(e) => setValor(centavosDeDigitos(e.target.value))}
                    className="mt-1 min-h-11 w-full rounded-2xl bg-fundo px-3 text-base font-bold tabular-nums outline-none focus:ring-2 focus:ring-lavanda"
                  />
                </label>
              )}
              {detalhes && (
                <label className="text-xs font-semibold">
                  Paguei em
                  <input
                    type="date"
                    max={hoje}
                    value={pagoEm}
                    onChange={(e) => setPagoEm(e.target.value)}
                    className="mt-1 min-h-11 w-full rounded-2xl bg-fundo px-3 text-base font-normal outline-none focus:ring-2 focus:ring-lavanda"
                  />
                </label>
              )}
            </div>
          )}
          {precisaValor && <input type="hidden" name="valor" value={valor} />}
          <input type="hidden" name="pagoEm" value={pagoEm} />
          {conta.origem !== "fatura" && bancos.length > 0 && (
            <div role="radiogroup" aria-label="Saiu de qual banco" className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-tinta-suave">Saiu do</span>
              {bancos.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={bancoId === b.id}
                  aria-label={b.nome}
                  onClick={() => setBancoId(bancoId === b.id ? "" : b.id)}
                  className={`flex min-h-9 items-center rounded-full border-2 px-1.5 ${bancoId === b.id ? "border-tinta" : "border-transparent opacity-50"}`}
                >
                  <SeloConta nome={b.nome} sigla={b.sigla} cor={b.cor} corTexto={b.corTexto} />
                </button>
              ))}
              {!bancoId && <span className="text-xs font-semibold">escolha o banco pra descontar do saldo</span>}
            </div>
          )}
          {bancoId && <input type="hidden" name="contaId" value={bancoId} />}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pagando || (precisaValor && valor <= 0)}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-menta font-semibold disabled:opacity-50"
            >
              {pagando ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <Check size={18} aria-hidden />}
              Paguei{pagoEm !== hoje ? ` em ${diaCurto(pagoEm)}` : ""}
            </button>
            {!detalhes && (
              <button type="button" onClick={() => setDetalhes(true)} className="min-h-11 rounded-2xl px-3 text-sm text-tinta-suave underline">
                Outro dia
              </button>
            )}
          </div>
        </form>
      )}

      {podeDesfazer && !compacta && (
        <form action={acaoDesfazer} className="mt-2 flex justify-end">
          <CamposConta conta={conta} />
          <button type="submit" disabled={desfazendo} className="flex min-h-11 items-center gap-1 px-2 text-sm text-tinta-suave underline">
            <Undo2 size={14} aria-hidden /> Ainda não paguei
          </button>
        </form>
      )}

      {erro && (
        <p role="alert" className="mt-2 rounded-2xl bg-coral px-3 py-2 text-sm font-semibold">
          {erro}
        </p>
      )}
    </li>
  );
}
