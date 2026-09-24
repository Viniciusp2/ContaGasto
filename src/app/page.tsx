import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, ChevronRight, HandCoins, KeyRound, Landmark, PiggyBank, Target, Utensils, Wallet } from "lucide-react";
import { SeletorMes } from "@/components/seletor-mes";
import {
  lancamentosParaCalculo,
  lancamentosVAAte,
  listarEmprestimosParaCalculo,
  listarLancamentosDoMes,
  listarObjetivos,
} from "@/db/consultas";
import { gerarRecorrencias } from "@/db/gerar-recorrencias";
import { obterAcesso } from "@/db/acesso";
import { metasDoMes } from "@/db/metas-do-mes";
import { BarraProgresso } from "@/components/barra-progresso";
import { contaComoGasto, resumoDoMes, saldoVA } from "@/lib/calculos";
import { disponivelParaGastar, possoGastarPorDia, previsaoDoMes } from "@/lib/painel";
import { assinaturasAtivas, comprometidoProximoMes, compromissosDoMes, entradasPrevistasDoMes, guardadoNoMes } from "@/db/painel";
import { CartaoDisponivel, CartaoPrevisao, CartoesDoProximoMes } from "@/components/painel";
import { LinhaDoTempo } from "@/components/linha-do-tempo";
import { montarLinhaDoTempo } from "@/lib/linha-do-tempo";
import { hojeISO, intervaloDoMes, lerMes, mesParaTexto } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";
import { NumeroAnimado } from "@/components/animacoes";

export const dynamic = "force-dynamic";

export default async function Inicio({ searchParams }: PageProps<"/">) {
  await gerarRecorrencias(); // fixos e parcelas que chegaram viram lançamento
  const acesso = await obterAcesso();
  const params = await searchParams;
  const mes = lerMes(typeof params.mes === "string" ? params.mes : undefined);
  const [lancamentos, emprestimos, movimentosVA] = await Promise.all([
    lancamentosParaCalculo(mes),
    listarEmprestimosParaCalculo(),
    lancamentosVAAte(mes),
  ]);
  // Caixa "de hoje" no mês atual; nos outros meses, como estava no último dia
  const { fim } = intervaloDoMes(mes);
  const hoje = hojeISO();
  const dataRef = mesParaTexto(mes) === hoje.slice(0, 7) ? hoje : fim;
  const resumo = resumoDoMes(lancamentos, emprestimos, dataRef);
  const va = saldoVA(movimentosVA);
  // Só as metas que pedem atenção (80% ou mais)
  const guardado = (await listarObjetivos()).reduce((s, o) => s + o.saldo, 0);
  const metasAlerta = (await metasDoMes(mes)).filter((m) => m.estado !== "ok").sort((a, b) => b.fracao - a.fracao);

  // Painel de "agora" (disponível, previsão, contas a vencer): só no mês atual
  const mesAtual = mesParaTexto(mes) === hoje.slice(0, 7);
  const painel = mesAtual ? await montarPainel(lancamentos, resumo.saldoReal, resumo.entradas) : null;

  async function montarPainel(lista: typeof lancamentos, saldoReal: number, entradas: number) {
    const [compromissos, guardadoMes, proximo, assinaturas, entradasPrevistas, doMes] = await Promise.all([
      compromissosDoMes(hoje, mes),
      guardadoNoMes(mes),
      comprometidoProximoMes(mes),
      assinaturasAtivas(hoje),
      entradasPrevistasDoMes(hoje, mes),
      listarLancamentosDoMes(mes),
    ]);
    const totalCompromissos = compromissos.reduce((s, c) => s + c.valor, 0);
    const disponivel = disponivelParaGastar(saldoReal, guardadoMes, totalCompromissos);
    const ateHoje = lista.filter((l) => l.data <= hoje && contaComoGasto(l));
    const previsao = previsaoDoMes({
      gastoAteHoje: ateHoje.reduce((s, l) => s + l.valor, 0),
      avulsoAteHoje: ateHoje.filter((l) => !l.recorrenciaId).reduce((s, l) => s + l.valor, 0),
      compromissos: totalCompromissos,
      hoje,
      mes,
    });
    const linha = montarLinhaDoTempo({
      hoje,
      disponivel,
      passados: doMes
        .filter((l) => l.status === "confirmado" && l.data <= hoje)
        .map((l) => ({
          chave: l.id,
          descricao: l.descricao,
          valor: l.valor,
          data: l.data,
          entrada: l.tipo === "entrada",
          icone: l.categoriaIcone,
          cor: l.categoriaCor,
          href: `/lancamentos/${l.id}/editar`,
          detalhe: l.parcela && l.totalParcelas ? `parcela ${l.parcela}/${l.totalParcelas}` : undefined,
        })),
      proximos: [...compromissos, ...entradasPrevistas].map((c) => ({ ...c, entrada: c.tipo === "entrada" })),
    });
    return {
      linha,
      compromissos,
      totalCompromissos,
      guardadoMes,
      disponivel,
      ...possoGastarPorDia(disponivel, hoje, mes),
      previsao,
      entradas,
      proximo,
      assinaturas,
    };
  }

  const cards = [
    {
      rotulo: "Saldo real",
      dica: "Entradas menos gastos",
      valor: resumo.saldoReal,
      Icone: Wallet,
      cor: resumo.saldoReal < 0 ? "bg-coral" : "bg-menta",
    },
    {
      rotulo: "Saldo em caixa",
      dica: "O que tem na conta",
      valor: resumo.saldoEmCaixa,
      Icone: Landmark,
      cor: "bg-lavanda",
    },
    { rotulo: "Recebido", dica: "Sem empréstimo", valor: resumo.entradas, Icone: ArrowDownCircle, cor: "bg-menta" },
    { rotulo: "Gasto", dica: "No mês", valor: resumo.gasto, Icone: ArrowUpCircle, cor: "bg-coral" },
  ];

  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Oi, Vinícius</h1>
      {acesso.ligado && acesso.usandoSenhaInicial && (
        <Link href="/mais" className="flex min-h-12 items-center gap-2 rounded-card bg-limao px-4 py-2 text-sm font-semibold">
          <KeyRound size={18} aria-hidden /> Você ainda está com a senha 1234. Toque aqui pra trocar.
        </Link>
      )}
      <SeletorMes mes={mes} href={(m) => `/?mes=${m}`} />

      {painel && (
        <CartaoDisponivel
          disponivel={painel.disponivel}
          porDia={painel.porDia}
          diasRestantes={painel.diasRestantes}
          guardado={painel.guardadoMes}
          compromissos={painel.totalCompromissos}
        />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ rotulo, dica, valor, Icone, cor }) => (
          <div key={rotulo} className="rounded-card bg-cartao p-4 shadow-suave">
            <span className={`mb-3 inline-flex rounded-full p-2 ${cor}`}>
              <Icone size={20} aria-hidden />
            </span>
            <p className="text-sm font-semibold">{rotulo}</p>
            <p className="text-xs text-tinta-suave">{dica}</p>
            <p className="mt-1 text-lg font-bold tabular-nums break-all sm:text-xl">
              <NumeroAnimado centavos={valor} />
            </p>
          </div>
        ))}
      </div>

      {painel && (
        <>
          <CartaoPrevisao previsao={painel.previsao} entradas={painel.entradas} />
          <LinhaDoTempo linha={painel.linha} hoje={hoje} mesTexto={mesParaTexto(mes)} />
          <CartoesDoProximoMes
            comprometido={painel.proximo.total}
            assinaturas={painel.assinaturas.total}
            quantasAssinaturas={painel.assinaturas.itens.length}
          />
        </>
      )}

      {(resumo.teDevem > 0 || resumo.voceDeve > 0) && (
        <Link
          href="/emprestimos"
          className="flex min-h-14 items-center gap-3 rounded-card bg-cartao px-4 py-3 shadow-suave"
        >
          <span className="inline-flex rounded-full bg-lavanda p-2">
            <HandCoins size={20} aria-hidden />
          </span>
          <span className="flex-1 text-sm">
            <span className="block font-semibold">Empréstimos</span>
            <span className="block text-tinta-suave">
              Te devem <strong className="tabular-nums">{formatarCentavos(resumo.teDevem)}</strong> · Você deve{" "}
              <strong className="tabular-nums">{formatarCentavos(resumo.voceDeve)}</strong>
            </span>
          </span>
          <ChevronRight size={20} aria-hidden />
        </Link>
      )}

      {metasAlerta.length > 0 && (
        <Link href={`/metas?mes=${mesParaTexto(mes)}`} className="flex flex-col gap-3 rounded-card bg-cartao p-4 shadow-suave">
          <span className="flex items-center gap-2 font-semibold">
            <Target size={18} aria-hidden /> Metas pedindo atenção
          </span>
          {metasAlerta.map((m) => (
            <span key={m.id} className="flex flex-col gap-1 text-sm">
              <span className="flex justify-between">
                <span>{m.categoriaNome}</span>
                <span className="tabular-nums">
                  {m.estado === "estourou" ? `passou ${formatarCentavos(m.passou)}` : `${Math.round(m.fracao * 100)}%`}
                </span>
              </span>
              <BarraProgresso fracao={m.fracao} estado={m.estado} rotulo={`${m.categoriaNome}: ${Math.round(m.fracao * 100)}%`} />
            </span>
          ))}
        </Link>
      )}

      {guardado > 0 && (
        <Link href="/objetivos" className="flex min-h-14 items-center gap-3 rounded-card bg-cartao px-4 py-3 shadow-suave">
          <span className="inline-flex rounded-full bg-limao p-2">
            <PiggyBank size={20} aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">Guardado em objetivos</span>
            <span className="block text-xs text-tinta-suave">Continua na conta, mas já tem destino</span>
          </span>
          <span className="text-lg font-bold tabular-nums">{formatarCentavos(guardado)}</span>
        </Link>
      )}

      {movimentosVA.length > 0 && (
        <div className="flex items-center gap-3 rounded-card bg-cartao p-4 shadow-suave">
          <span className="inline-flex rounded-full bg-menta p-2">
            <Utensils size={20} aria-hidden />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Vale alimentação</p>
            <p className="text-xs text-tinta-suave">Saldo à parte, só pra comida</p>
          </div>
          <p className="text-lg font-bold tabular-nums">{formatarCentavos(va)}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/lancamentos?mes=${mesParaTexto(mes)}`}
          className="flex min-h-14 items-center justify-between rounded-card bg-cartao px-4 text-sm font-semibold shadow-suave"
        >
          Lançamentos
          <ChevronRight size={20} aria-hidden />
        </Link>
        <Link
          href={`/graficos?mes=${mesParaTexto(mes)}`}
          className="flex min-h-14 items-center justify-between rounded-card bg-cartao px-4 text-sm font-semibold shadow-suave"
        >
          Gráficos
          <ChevronRight size={20} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
