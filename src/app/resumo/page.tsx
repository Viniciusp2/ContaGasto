import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { IconeCategoria } from "@/components/icone-categoria";
import { lancamentosDoAno, listarTodasCategorias } from "@/db/consultas";
import { gerarRecorrencias } from "@/db/gerar-recorrencias";
import { gastoPorCategoria, resumoPorPeriodo, type Periodo } from "@/lib/calculos";
import { hojeISO } from "@/lib/datas";
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

      <div role="tablist" aria-label="Período" className="grid grid-cols-4 gap-1 rounded-card bg-lavanda p-1.5">
        {periodos.map((p) => (
          <Link
            key={p.valor}
            role="tab"
            aria-selected={p.valor === periodo}
            href={href(ano, p.valor)}
            className={`flex min-h-11 items-center justify-center rounded-2xl text-sm ${
              p.valor === periodo ? "bg-cartao font-semibold shadow-suave" : "text-tinta-suave"
            }`}
          >
            {p.rotulo}
          </Link>
        ))}
      </div>

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
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-fundo">
                          <span className="block h-full rounded-full bg-menta" style={{ width: `${(p.entradas / base) * 100}%` }} />
                        </span>
                        <span className="w-24 text-right tabular-nums">{formatarCentavos(p.entradas)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="w-16 text-tinta-suave">Gasto</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-fundo">
                          <span className="block h-full rounded-full bg-coral" style={{ width: `${(p.gasto / base) * 100}%` }} />
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
                        <span className="mt-1 block h-2 overflow-hidden rounded-full bg-fundo">
                          <span className="block h-full rounded-full bg-coral" style={{ width: `${(valor / maiorValor) * 100}%` }} />
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
