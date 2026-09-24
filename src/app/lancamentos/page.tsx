import Link from "next/link";
import { Plus, Receipt, Search } from "lucide-react";
import { historicoContasVariaveis, listarLancamentosDoMes } from "@/db/consultas";
import { comparacaoComMedia } from "@/lib/recorrencias";
import { gerarRecorrencias } from "@/db/gerar-recorrencias";
import { ItemLancamentoLinha } from "@/components/item-lancamento";
import { SeletorMes } from "@/components/seletor-mes";
import { diaCurto, lerMes, mesParaTexto } from "@/lib/datas";
import { filtrarLancamentos } from "@/lib/busca";
import { formatarCentavos, textoDiferencaMedia } from "@/lib/dinheiro";

// Lê o banco a cada acesso: o que o usuário lançou precisa aparecer na hora
export const dynamic = "force-dynamic";

const filtros = [
  { valor: undefined, rotulo: "Tudo" },
  { valor: "gasto", rotulo: "Gastos" },
  { valor: "entrada", rotulo: "Entradas" },
] as const;

export default async function Lancamentos({ searchParams }: PageProps<"/lancamentos">) {
  await gerarRecorrencias(); // fixos e parcelas que chegaram viram lançamento
  const params = await searchParams;
  const mes = lerMes(typeof params.mes === "string" ? params.mes : undefined);
  const textoMes = mesParaTexto(mes);
  const tipo = params.tipo === "gasto" || params.tipo === "entrada" ? params.tipo : undefined;

  const busca = typeof params.q === "string" ? params.q.slice(0, 80) : "";

  const todos = await listarLancamentosDoMes(mes);

  // Conta variável confirmada: compara com a média dos meses anteriores (4.8)
  const variaveis = todos.filter((l) => l.recorrenciaTipo === "fixa_variavel" && l.status === "confirmado");
  const historico = await historicoContasVariaveis([...new Set(variaveis.map((l) => l.recorrenciaId!))]);
  const comparacoes = new Map<string, string>();
  for (const l of variaveis) {
    const anteriores = (historico.get(l.recorrenciaId!) ?? []).filter((h) => h.data < l.data).map((h) => h.valor);
    const c = comparacaoComMedia(l.valor, anteriores, l.mesesMedia ?? 3);
    if (c) comparacoes.set(l.id, textoDiferencaMedia(c.diferenca));
  }
  const itens = filtrarLancamentos(tipo ? todos.filter((i) => i.tipo === tipo) : todos, busca);
  const totalGastos = itens.filter((i) => i.tipo === "gasto" && i.status === "confirmado").reduce((s, i) => s + i.valor, 0);
  const totalEntradas = itens.filter((i) => i.tipo === "entrada" && i.status === "confirmado").reduce((s, i) => s + i.valor, 0);

  const hrefFiltro = (mesTexto: string, t?: string) =>
    `/lancamentos?mes=${mesTexto}${t ? `&tipo=${t}` : ""}${busca ? `&q=${encodeURIComponent(busca)}` : ""}`;

  // Agrupa por dia (a lista já vem ordenada do mais novo pro mais velho)
  const dias: { data: string; itens: typeof itens }[] = [];
  for (const item of itens) {
    const ultimo = dias.at(-1);
    if (ultimo?.data === item.data) ultimo.itens.push(item);
    else dias.push({ data: item.data, itens: [item] });
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Lançamentos</h1>
      <SeletorMes mes={mes} href={(m) => hrefFiltro(m, tipo)} />

      <div className="flex gap-2" role="group" aria-label="Filtrar por tipo">
        {filtros.map((f) => (
          <Link
            key={f.rotulo}
            href={hrefFiltro(textoMes, f.valor)}
            aria-current={tipo === f.valor ? "true" : undefined}
            className={`flex min-h-11 items-center rounded-full px-4 text-sm ${
              tipo === f.valor ? "bg-lavanda font-semibold" : "bg-cartao"
            }`}
          >
            {f.rotulo}
          </Link>
        ))}
      </div>

      {/* Busca: formulário comum (GET), funciona até sem JavaScript */}
      <form role="search" action="/lancamentos" className="flex gap-2">
        <input type="hidden" name="mes" value={textoMes} />
        {tipo && <input type="hidden" name="tipo" value={tipo} />}
        <label htmlFor="busca" className="sr-only">
          Buscar no mês
        </label>
        <input
          id="busca"
          name="q"
          type="search"
          defaultValue={busca}
          placeholder="Buscar: mercado, pix, 45,90..."
          className="min-h-11 min-w-0 flex-1 rounded-2xl bg-cartao px-4 shadow-suave outline-none focus:ring-2 focus:ring-lavanda"
        />
        <button type="submit" aria-label="Buscar" className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-lavanda">
          <Search size={18} aria-hidden />
        </button>
      </form>

      {busca && (
        <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            {itens.length} {itens.length === 1 ? "resultado" : "resultados"} pra &quot;{busca}&quot;
            {totalGastos > 0 && <> · gastou <strong className="tabular-nums">{formatarCentavos(totalGastos)}</strong></>}
            {totalEntradas > 0 && <> · entrou <strong className="tabular-nums">{formatarCentavos(totalEntradas)}</strong></>}
          </span>
          <Link href={`/lancamentos?mes=${textoMes}${tipo ? `&tipo=${tipo}` : ""}`} className="inline-flex min-h-11 items-center font-semibold underline">
            Limpar busca
          </Link>
        </p>
      )}

      {dias.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-cartao p-8 text-center shadow-suave">
          <span className="rounded-full bg-lavanda p-4">
            <Receipt size={28} aria-hidden />
          </span>
          <p className="text-tinta-suave">{busca ? "Nada encontrado nesse mês." : `Nada lançado ${tipo ? "desse tipo " : ""}nesse mês.`}</p>
          <Link
            href="/lancamentos/novo"
            className="flex min-h-11 items-center gap-2 rounded-full bg-coral px-5 font-semibold"
          >
            <Plus size={18} aria-hidden /> Lançar agora
          </Link>
        </div>
      ) : (
        dias.map((dia) => (
          <div key={dia.data}>
            <h3 className="mb-2 text-sm font-semibold text-tinta-suave capitalize">{diaCurto(dia.data)}</h3>
            <ul className="flex flex-col gap-2">
              {dia.itens.map((item) => (
                <ItemLancamentoLinha key={item.id} item={item} comparacao={comparacoes.get(item.id)} />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
