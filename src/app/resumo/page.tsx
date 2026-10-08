import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { BarraProgresso } from "@/components/barra-progresso";
import { GraficoMeses, GraficoSemana } from "@/components/graficos";
import { IconeCategoria } from "@/components/icone-categoria";
import { lancamentosDoAno, listarTodasCategorias } from "@/db/consultas";
import { gerarRecorrencias } from "@/db/gerar-recorrencias";
import { diasCorridos, diasQueMaisGastou, distribuicao, gastoPorMes, padroesDoAno } from "@/lib/analise-ano";
import { gastoPorCategoria, resumoPorPeriodo, type Periodo } from "@/lib/calculos";
import { diaCurto, hojeISO } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";

export const dynamic = "force-dynamic";

const periodos: { valor: Periodo; rotulo: string }[] = [
  { valor: "mes", rotulo: "Mês" },
  { valor: "tri", rotulo: "Trimestre" },
  { valor: "sem", rotulo: "Semestre" },
  { valor: "ano", rotulo: "Ano" },
];

export default async function Resumo({ searchParams }: PageProps<"/resumo">) {
  await gerarRecorrencias();
  const params = await searchParams;
  const hoje = hojeISO();
  const anoAtual = Number(hoje.slice(0, 4));
  const anoLido = Number(params.ano);
  const ano = Number.isInteger(anoLido) && anoLido >= 2000 && anoLido <= 2100 ? anoLido : anoAtual;
  const periodo = (periodos.some((p) => p.valor === params.periodo) ? params.periodo : "mes") as Periodo;

  // Ano corrente vai até o mês atual (em andamento); ano futuro não tem nada pra mostrar
  const mesAtual = ano === anoAtual ? Number(hoje.slice(5, 7)) : undefined;
  const ateMes = mesAtual ?? (ano > anoAtual ? 0 : 12);
  const [lancamentos, categorias] = await Promise.all([lancamentosDoAno(ano), listarTodasCategorias()]);
  const linhas = ateMes > 0 ? resumoPorPeriodo(lancamentos, ano, periodo, mesAtual) : [];
  const total = ateMes > 0 ? resumoPorPeriodo(lancamentos, ano, "ano", mesAtual)[0] : null;

  // Onde mais foi dinheiro no ano (sem VA, sem estimado)
  const porCategoria = gastoPorCategoria(lancamentos.filter((l) => Number(l.data.slice(5, 7)) <= ateMes));
  const nomes = new Map(categorias.map((c) => [c.id, c]));
  const topo = [...porCategoria.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maiorValor = topo[0]?.[1] ?? 0;

  // Análise do ano: meses, dias e padrões (só até o mês atual)
  const doPeriodo = lancamentos.filter((l) => Number(l.data.slice(5, 7)) <= ateMes);
  const meses = ateMes > 0 ? gastoPorMes(doPeriodo, ateMes) : [];
  const temGasto = meses.some((m) => m.gasto > 0);
  const padroes = padroesDoAno(doPeriodo, ateMes, mesAtual);
  const dias = diasQueMaisGastou(doPeriodo, 5);
  const dist = distribuicao(doPeriodo);
  const semana = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((dia, i) => ({ dia, valor: dist.semana[i] }));
  const mediaPorDia = Math.floor(dist.total / Math.max(1, diasCorridos(ano, Math.max(ateMes, 1), mesAtual ? hoje : undefined)));
  const partes: [string, number][] = [
    ["Do dia 1 ao 15", dist.primeiraQuinzena],
    ["Do dia 16 ao fim do mês", dist.total - dist.primeiraQuinzena],
    ["Fim de semana", dist.fimDeSemana],
    ["Segunda a sexta", dist.total - dist.fimDeSemana],
  ];
  const cartao = "rounded-card bg-cartao p-4 shadow-suave";

  const href = (a: number, p: Periodo) => `/resumo?ano=${a}&periodo=${p}`;
  const botao = "flex size-11 items-center justify-center rounded-full bg-cartao shadow-suave active:scale-90";

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link href="/mais" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave">
          <ArrowLeft size={16} aria-hidden /> Mais
        </Link>
        <h1 className="text-2xl font-bold">Resumo do ano</h1>
      </div>

      <nav aria-label="Trocar de ano" className="flex items-center justify-between">
        <Link href={href(ano - 1, periodo)} aria-label="Ano anterior" className={botao}>
          <ChevronLeft aria-hidden />
        </Link>
        <h2 className="text-lg font-bold">{ano}</h2>
        <Link href={href(ano + 1, periodo)} aria-label="Próximo ano" className={botao}>
          <ChevronRight aria-hidden />
        </Link>
      </nav>

      {!total ? (
        <p className="rounded-card bg-cartao p-8 text-center text-tinta-suave shadow-suave">Esse ano ainda não começou.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 rounded-card bg-cartao p-4 text-center shadow-suave">
            <div>
              <p className="text-xs text-tinta-suave">Recebido</p>
              <p className="font-bold tabular-nums">{formatarCentavos(total.entradas)}</p>
            </div>
            <div>
              <p className="text-xs text-tinta-suave">Gasto</p>
              <p className="font-bold tabular-nums">{formatarCentavos(total.gasto)}</p>
            </div>
            <div>
              <p className="text-xs text-tinta-suave">Sobrou</p>
              <p className={`font-bold tabular-nums ${total.saldo < 0 ? "text-negativo" : ""}`}>{formatarCentavos(total.saldo)}</p>
            </div>
          </div>

          {temGasto && (
            <>
              <section className={cartao}>
                <h2 className="font-bold">Gasto mês a mês</h2>
                <p className="mb-2 text-sm text-tinta-suave">
                  Média de {formatarCentavos(mediaPorDia)} por dia no ano
                  {mesAtual ? `, ${meses.at(-1)?.rotulo} ainda em andamento` : ""}
                </p>
                <GraficoMeses meses={meses} emAndamento={mesAtual} />
              </section>

              {padroes.length > 0 && (
                <section className={cartao}>
                  <h2 className="mb-3 flex items-center gap-2 font-bold">
                    <Sparkles size={18} aria-hidden /> O que dá pra notar
                  </h2>
                  <ul className="flex flex-col gap-2 text-sm">
                    {padroes.map((p) => (
                      <li key={p} className="rounded-2xl bg-fundo px-3 py-2">
                        {p}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {dias.length > 0 && (
                <section className={cartao}>
                  <h2 className="mb-3 flex items-center gap-2 font-bold">
                    <CalendarDays size={18} aria-hidden /> Os dias que mais pesaram
                  </h2>
                  <ol className="flex flex-col gap-3">
                    {dias.map((d, i) => (
                      <li key={d.data} className="flex flex-col gap-1 text-sm">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold capitalize">
                            {i + 1}. {diaCurto(d.data)}
                          </span>
                          <span className="font-bold tabular-nums">{formatarCentavos(d.total)}</span>
                        </span>
                        <BarraProgresso fracao={d.total / dias[0].total} estado="gasto" rotulo={`${diaCurto(d.data)}: ${formatarCentavos(d.total)}`} />
                        <span className="text-xs text-tinta-suave">
                          {d.maior && d.compras > 1
                            ? `${d.compras} lançamentos, o maior foi ${d.maior.descricao} (${formatarCentavos(d.maior.valor)})`
                            : d.maior?.descricao}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <section className={cartao}>
                <h2 className="font-bold">Por dia da semana</h2>
                <p className="mb-2 text-sm text-tinta-suave">Tudo que você gastou no ano, separado por dia da semana</p>
                <GraficoSemana dias={semana} />
              </section>

              <section className={cartao}>
                <h2 className="mb-3 font-bold">Quando o dinheiro sai</h2>
                <div className="flex flex-col gap-3 text-sm">
                  {partes.map(([rotulo, valor]) => (
                    <div key={rotulo} className="flex flex-col gap-1">
                      <span className="flex justify-between gap-2">
                        <span>{rotulo}</span>
                        <span className="tabular-nums">
                          <strong>{formatarCentavos(valor)}</strong> · {dist.total > 0 ? Math.round((valor / dist.total) * 100) : 0}%
                        </span>
                      </span>
                      <BarraProgresso fracao={dist.total > 0 ? valor / dist.total : 0} estado="gasto" rotulo={`${rotulo}: ${formatarCentavos(valor)}`} />
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <h2 className="mt-2 font-bold">Por período</h2>
          <div role="tablist" aria-label="Período" className="grid grid-cols-4 gap-1 rounded-card bg-lavanda p-1.5">
            {periodos.map((p) => (
              <Link
                key={p.valor}
                role="tab"
                aria-selected={p.valor === periodo}
                href={href(ano, p.valor)}
                scroll={false}
                className={`flex min-h-11 items-center justify-center rounded-2xl text-sm ${
                  p.valor === periodo ? "bg-cartao font-semibold shadow-suave" : "text-tinta-suave"
                }`}
              >
                {p.rotulo}
              </Link>
            ))}
          </div>

          {periodo !== "ano" && (
            <ul className="flex flex-col gap-2">
              {[...linhas].reverse().map((p) => {
                const base = Math.max(p.entradas, p.gasto, 1);
                return (
                  <li key={p.rotulo} className="rounded-card bg-cartao p-4 shadow-suave">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-semibold capitalize">
                        {p.rotulo}
                        {p.emAndamento && <span className="ml-2 rounded-full bg-limao px-2 text-xs font-semibold normal-case">em andamento</span>}
                      </p>
                      <p className={`font-bold tabular-nums ${p.saldo < 0 ? "text-negativo" : ""}`}>{formatarCentavos(p.saldo)}</p>
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="flex items-center gap-2">
                        <span className="w-16 text-tinta-suave">Recebido</span>
                        <span className="flex-1">
                          <BarraProgresso fracao={p.entradas / base} estado="positivo" rotulo={`Recebido em ${p.rotulo}`} />
                        </span>
                        <span className="w-24 text-right tabular-nums">{formatarCentavos(p.entradas)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="w-16 text-tinta-suave">Gasto</span>
                        <span className="flex-1">
                          <BarraProgresso fracao={p.gasto / base} estado="gasto" rotulo={`Gasto em ${p.rotulo}`} />
                        </span>
                        <span className="w-24 text-right tabular-nums">{formatarCentavos(p.gasto)}</span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {topo.length > 0 && (
            <div className="rounded-card bg-cartao p-4 shadow-suave">
              <h2 className="mb-3 font-bold">Onde mais foi dinheiro</h2>
              <ul className="flex flex-col gap-3">
                {topo.map(([id, valor]) => {
                  const c = nomes.get(id);
                  return (
                    <li key={id} className="flex items-center gap-3 text-sm">
                      <span
                        className="sobre-pastel flex size-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: c?.cor }}
                        aria-hidden
                      >
                        <IconeCategoria nome={c?.icone ?? ""} size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex justify-between">
                          <span className="truncate">{c?.nome ?? "Categoria"}</span>
                          <span className="font-semibold tabular-nums">{formatarCentavos(valor)}</span>
                        </span>
                        <span className="mt-1 block">
                          <BarraProgresso fracao={valor / maiorValor} estado="gasto" rotulo={`${c?.nome ?? "Categoria"}: ${formatarCentavos(valor)}`} />
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
