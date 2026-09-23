import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { listarLancamentosDoMes } from "@/db/consultas";
import { gerarRecorrencias } from "@/db/gerar-recorrencias";
import { ItemLancamentoLinha } from "@/components/item-lancamento";
import { SeletorMes } from "@/components/seletor-mes";
import { diaCurto, lerMes, mesParaTexto } from "@/lib/datas";

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

  const todos = await listarLancamentosDoMes(mes);
  const itens = tipo ? todos.filter((i) => i.tipo === tipo) : todos;

  const hrefFiltro = (mesTexto: string, t?: string) =>
    `/lancamentos?mes=${mesTexto}${t ? `&tipo=${t}` : ""}`;

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

      {dias.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-cartao p-8 text-center shadow-suave">
          <span className="rounded-full bg-lavanda p-4">
            <Receipt size={28} aria-hidden />
          </span>
          <p className="text-tinta-suave">Nada lançado {tipo ? "desse tipo " : ""}nesse mês.</p>
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
                <ItemLancamentoLinha key={item.id} item={item} />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
