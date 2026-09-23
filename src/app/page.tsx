import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, ChevronRight, Landmark, Wallet } from "lucide-react";
import { SeletorMes } from "@/components/seletor-mes";
import { lancamentosParaCalculo, listarEmprestimosParaCalculo } from "@/db/consultas";
import { resumoDoMes } from "@/lib/calculos";
import { lerMes, mesParaTexto } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";

export const dynamic = "force-dynamic";

export default async function Inicio({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const mes = lerMes(typeof params.mes === "string" ? params.mes : undefined);
  const [lancamentos, emprestimos] = await Promise.all([
    lancamentosParaCalculo(mes),
    listarEmprestimosParaCalculo(),
  ]);
  const resumo = resumoDoMes(lancamentos, emprestimos);

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
      dica: "Com empréstimos",
      valor: resumo.saldoEmCaixa,
      Icone: Landmark,
      cor: "bg-lavanda",
    },
    { rotulo: "Recebido", dica: "Sem empréstimo", valor: resumo.entradas, Icone: ArrowDownCircle, cor: "bg-menta" },
    { rotulo: "Gasto", dica: "No mês", valor: resumo.gasto, Icone: ArrowUpCircle, cor: "bg-coral" },
  ];

  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Oi, Vinícius 👋</h1>
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

      <Link
        href={`/lancamentos?mes=${mesParaTexto(mes)}`}
        className="flex min-h-14 items-center justify-between rounded-card bg-cartao px-4 font-semibold shadow-suave"
      >
        Ver lançamentos do mês
        <ChevronRight size={20} aria-hidden />
      </Link>
    </section>
  );
}
