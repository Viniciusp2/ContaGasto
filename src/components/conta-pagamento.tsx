"use client";

import { useActionState, useState } from "react";
import { Check, Handshake, LoaderCircle, Undo2 } from "lucide-react";
import { desfazerNegociacao, desfazerPagamento, negociar, pagar, type EstadoPagamento } from "@/app/pagamentos/actions";
import { IconeCategoria } from "@/components/icone-categoria";
import { SeloConta } from "@/components/selo-conta";
import type { ContaDoMes } from "@/db/pagamentos";
import { ROTULO_URGENCIA, situacaoConta, textoVencimento, type NivelUrgencia, type Urgencia } from "@/lib/contas";
import { diaCurto } from "@/lib/datas";
import { centavosDeDigitos, formatarCentavos } from "@/lib/dinheiro";

// Cor da etiqueta de urgência (pastel com texto escuro, como as outras pílulas)
const corUrgencia: Record<NivelUrgencia, string> = {
  urgente: "bg-coral",
  logo: "bg-limao",
  calma: "bg-fundo",
  negociando: "bg-lavanda",
};

// Negociar (1.10.3): negociando ainda, ou acordo fechado com data e valor novos (opcionais)
function FormNegociar({ conta, hoje, aoFechar }: { conta: ContaDoMes; hoje: string; aoFechar: () => void }) {
  const [situacao, setSituacao] = useState(conta.negociacao === "acordo" ? "acordo" : "negociando");
  const [valor, setValor] = useState(0);
  const [estado, acao, salvando] = useActionState(async (a: EstadoPagamento, fd: FormData) => {
    const r = await negociar(a, fd);
    if (r.ok) aoFechar();
    return r;
  }, {});
  return (
    <form action={acao} className="mt-3 flex flex-col gap-2 rounded-2xl bg-fundo p-3">
      <input type="hidden" name="lancamentoId" value={conta.lancamentoId} />
      <input type="hidden" name="situacao" value={situacao} />
      <div role="radiogroup" aria-label="Como está a negociação" className="grid grid-cols-2 gap-2">
        {(["negociando", "acordo"] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={situacao === s}
            onClick={() => setSituacao(s)}
            className={`min-h-11 rounded-full text-sm font-semibold ${situacao === s ? "bg-lavanda" : "bg-cartao"}`}
          >
            {s === "negociando" ? "Negociando" : "Acordo fechado"}
          </button>
        ))}
      </div>
      {situacao === "acordo" && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold">
            Nova data (opcional)
            <input
              type="date"
              name="novaData"
              min={hoje}
              className="mt-1 min-h-11 w-full rounded-2xl bg-cartao px-3 text-base font-normal outline-none focus:ring-2 focus:ring-lavanda"
            />
          </label>
          <label className="text-xs font-semibold">
            Novo valor (opcional)
            <input
              inputMode="numeric"
              value={valor ? formatarCentavos(valor) : ""}
              placeholder={formatarCentavos(conta.valor)}
              onChange={(e) => setValor(centavosDeDigitos(e.target.value))}
              className="mt-1 min-h-11 w-full rounded-2xl bg-cartao px-3 text-base font-bold tabular-nums outline-none focus:ring-2 focus:ring-lavanda"
            />
          </label>
          {valor > 0 && <input type="hidden" name="novoValor" value={valor} />}
        </div>
      )}
      <label className="text-xs font-semibold">
        Observação (opcional)
        <input
          name="obs"
          defaultValue={conta.negociacaoObs ?? ""}
          maxLength={300}
          placeholder={situacao === "acordo" ? "ex.: sem juros, 2x no boleto" : "ex.: liguei, vão retornar"}
          className="mt-1 min-h-11 w-full rounded-2xl bg-cartao px-3 text-base font-normal outline-none focus:ring-2 focus:ring-lavanda"
        />
      </label>
      {estado.erro && (
        <p role="alert" className="rounded-2xl bg-coral px-3 py-2 text-sm font-semibold">
          {estado.erro}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={salvando} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-lavanda font-semibold disabled:opacity-50">
          {salvando ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <Handshake size={18} aria-hidden />}
          Salvar negociação
        </button>
        <button type="button" onClick={aoFechar} className="min-h-11 rounded-2xl px-3 text-sm text-tinta-suave underline">
          Cancelar
        </button>
      </div>
    </form>
  );
}

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
  urgencia = null,
}: {
  conta: ContaDoMes;
  hoje: string;
  compacta?: boolean;
  bancos?: Banco[]; // bancos de onde a conta pode ter saído (sem o do VA)
  bancoPadrao?: string | null; // último banco usado
  urgencia?: Urgencia | null; // quanto é urgente pagar (1.10.3); só nas contas a pagar
}) {
  const [detalhes, setDetalhes] = useState(false);
  const [negociandoAberto, setNegociandoAberto] = useState(false);
  const [estadoTirar, acaoTirar, tirando] = useActionState(desfazerNegociacao, {});
  const podeNegociar = conta.origem === "lancamento" && !conta.paga && !conta.automatico;
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

      {(urgencia || (conta.negociacao && !conta.paga)) && !compacta && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {urgencia && (
            <span className={`sobre-pastel rounded-full px-2 py-0.5 font-semibold text-tinta ${corUrgencia[urgencia.nivel]}`}>
              {ROTULO_URGENCIA[urgencia.nivel]}
            </span>
          )}
          {urgencia && <span className="text-tinta-suave">{urgencia.motivo}</span>}
          {conta.negociacao === "acordo" && (
            <span className="flex items-center gap-1 font-semibold">
              <Handshake size={14} aria-hidden /> acordo fechado
            </span>
          )}
          {conta.negociacaoObs && <span className="w-full text-tinta-suave">&ldquo;{conta.negociacaoObs}&rdquo;</span>}
        </div>
      )}

      {negociandoAberto && podeNegociar && <FormNegociar conta={conta} hoje={hoje} aoFechar={() => setNegociandoAberto(false)} />}

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
            {podeNegociar && !compacta && !negociandoAberto && (
              <button
                type="button"
                onClick={() => setNegociandoAberto(true)}
                className="flex min-h-11 items-center gap-1 rounded-2xl px-3 text-sm text-tinta-suave underline"
              >
                <Handshake size={14} aria-hidden /> Negociar
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

      {conta.negociacao && podeNegociar && !compacta && (
        <form action={acaoTirar} className="mt-1 flex justify-end">
          <input type="hidden" name="lancamentoId" value={conta.lancamentoId} />
          <button type="submit" disabled={tirando} className="min-h-11 px-2 text-sm text-tinta-suave underline">
            Tirar negociação
          </button>
        </form>
      )}

      {(erro || estadoTirar.erro) && (
        <p role="alert" className="mt-2 rounded-2xl bg-coral px-3 py-2 text-sm font-semibold">
          {erro ?? estadoTirar.erro}
        </p>
      )}
    </li>
  );
}
