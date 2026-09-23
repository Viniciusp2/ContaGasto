import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, ChevronRight, HandCoins, Landmark, PiggyBank, Target, Utensils, Wallet } from "lucide-react";
import { SeletorMes } from "@/components/seletor-mes";
import { lancamentosParaCalculo, lancamentosVAAte, listarEmprestimosParaCalculo, listarObjetivos } from "@/db/consultas";
import { gerarRecorrencias } from "@/db/gerar-recorrencias";
import { metasDoMes } from "@/db/metas-do-mes";
import { BarraProgresso } from "@/components/barra-progresso";
import { resumoDoMes, saldoVA } from "@/lib/calculos";
import { hojeISO, intervaloDoMes, lerMes, mesParaTexto } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";

export const dynamic = "force-dynamic";

export default async function Inicio({ searchParams }: PageProps<"/">) {
  await gerarRecorrencias(); // fixos e parcelas que chegaram viram lançamento
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
      <SeletorMes mes={mes} href={(m) => `/?mes=${m}`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ rotulo, dica, valor, Icone, cor }) => (
          <div key={rotulo} className="rounded-card bg-cartao p-4 shadow-suave">
            <span className={`mb-3 inline-flex rounded-full p-2 ${cor}`}>
              <Icone size={20} aria-hidden />
            </span>
            <p className="text-sm font-semibold">{rotulo}</p>
            <p className="text-xs text-tinta-suave">{dica}</p>
            <p className="mt-1 text-lg font-bold tabular-nums break-all sm:text-xl">
              {formatarCentavos(valor)}
            </p>
          </div>
        ))}
      </div>

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
