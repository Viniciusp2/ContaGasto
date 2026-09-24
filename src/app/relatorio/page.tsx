import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BotaoImprimir } from "@/components/botao-imprimir";
import { SeletorMes } from "@/components/seletor-mes";
import { lancamentosParaCalculo, listarEmprestimosParaCalculo, listarLancamentosDoMes, listarTodasCategorias } from "@/db/consultas";
import { gerarRecorrencias } from "@/db/gerar-recorrencias";
import { metasDoMes } from "@/db/metas-do-mes";
import { gastoPorCategoria, resumoDoMes } from "@/lib/calculos";
import { diaCurto, hojeISO, intervaloDoMes, lerMes, mesParaTexto, nomeDoMes } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";
import { maioresViloes } from "@/lib/graficos";

export const dynamic = "force-dynamic";

// Relatório do mês feito pra papel: sem barra, sem botões, fundo branco (ver regras print: no globals.css)
export default async function Relatorio({ searchParams }: PageProps<"/relatorio">) {
  await gerarRecorrencias();
  const params = await searchParams;
  const mes = lerMes(typeof params.mes === "string" ? params.mes : undefined);
  const hoje = hojeISO();
  const { fim } = intervaloDoMes(mes);
  const dataRef = mesParaTexto(mes) === hoje.slice(0, 7) ? hoje : fim;

  const [calc, emprestimos, lista, categorias, metas] = await Promise.all([
    lancamentosParaCalculo(mes),
    listarEmprestimosParaCalculo(),
    listarLancamentosDoMes(mes),
    listarTodasCategorias(),
    metasDoMes(mes),
  ]);
  const resumo = resumoDoMes(calc, emprestimos, dataRef);
  const viloes = maioresViloes(gastoPorCategoria(calc), new Map(categorias.map((c) => [c.id, c.nome])));
  const itens = [...lista].sort((a, b) => a.data.localeCompare(b.data));

  const numeros = [
    ["Recebido", resumo.entradas],
    ["Gasto", resumo.gasto],
    ["Saldo real", resumo.saldoReal],
    ["Saldo em caixa", resumo.saldoEmCaixa],
  ] as const;

  return (
    <article className="relatorio flex flex-col gap-5">
      <div className="flex flex-col gap-3 print:hidden">
        <Link href="/mais" className="inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave">
          <ArrowLeft size={16} aria-hidden /> Mais
        </Link>
        <SeletorMes mes={mes} href={(m) => `/relatorio?mes=${m}`} />
        <BotaoImprimir />
      </div>

      <header>
        <p className="text-sm text-tinta-suave">Bolso · relatório do mês</p>
        <h1 className="text-2xl font-bold capitalize">{nomeDoMes(mes)}</h1>
        <p className="text-xs text-tinta-suave">Gerado em {diaCurto(hoje)}. Sem estimados, empréstimos e vale alimentação nos totais.</p>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {numeros.map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-2xl border border-lavanda p-3">
            <p className="text-xs text-tinta-suave">{rotulo}</p>
            <p className={`font-bold tabular-nums ${valor < 0 ? "text-negativo" : ""}`}>{formatarCentavos(valor)}</p>
          </div>
        ))}
      </section>

      {viloes.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">Onde mais foi dinheiro</h2>
          <table className="w-full text-sm">
            <tbody>
              {viloes.map((v) => (
                <tr key={v.nome} className="border-b border-lavanda">
                  <td className="py-1">{v.nome}</td>
                  <td className="py-1 text-right tabular-nums">{formatarCentavos(v.valor)}</td>
                  <td className="w-16 py-1 text-right text-tinta-suave tabular-nums">
                    {resumo.gasto > 0 ? `${Math.round((v.valor / resumo.gasto) * 100)}%` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {metas.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">Metas</h2>
          <table className="w-full text-sm">
            <tbody>
              {metas.map((m) => (
                <tr key={m.id} className="border-b border-lavanda">
                  <td className="py-1">{m.categoriaNome}</td>
                  <td className="py-1 text-right tabular-nums">
                    {formatarCentavos(m.gasto)} de {formatarCentavos(m.limiteMensal)}
                  </td>
                  <td className="w-24 py-1 text-right">
                    {m.estado === "estourou" ? "estourou" : `${Math.round(m.fracao * 100)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-bold">Lançamentos ({itens.length})</h2>
        {itens.length === 0 ? (
          <p className="text-sm text-tinta-suave">Nada lançado nesse mês.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-lavanda text-left text-xs text-tinta-suave">
                <th className="py-1 font-semibold">Dia</th>
                <th className="py-1 font-semibold">Descrição</th>
                <th className="py-1 text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((l) => (
                <tr key={l.id} className="border-b border-lavanda align-top">
                  <td className="py-1 pr-2 whitespace-nowrap">{Number(l.data.slice(8, 10))}</td>
                  <td className="py-1">
                    {l.descricao}
                    <span className="block text-xs text-tinta-suave">
                      {l.categoriaNome}
                      {l.formaNome ? ` · ${l.formaNome}` : ""}
                      {l.status === "estimado" ? " · estimado" : ""}
                    </span>
                  </td>
                  <td className="py-1 text-right whitespace-nowrap tabular-nums">
                    {l.tipo === "entrada" ? "+ " : "- "}
                    {formatarCentavos(l.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </article>
  );
}
