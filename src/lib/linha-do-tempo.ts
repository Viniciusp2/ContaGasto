// Linha do tempo financeira (CLAUDE.md 4.10): o que já aconteceu, o que vai cair e como o mês fecha.

export type ItemTempo = {
  chave: string;
  descricao: string;
  valor: number; // sempre positivo; o sentido vem de "entrada"
  data: string;
  entrada: boolean;
  detalhe?: string;
  icone?: string;
  cor?: string;
  href?: string;
};

export function montarLinhaDoTempo({
  hoje,
  passados,
  proximos,
  disponivel,
  quantosRecentes = 3,
}: {
  hoje: string;
  passados: ItemTempo[]; // lançamentos confirmados do mês até hoje
  proximos: ItemTempo[]; // o que ainda vai cair (gastos e entradas previstas)
  disponivel: number; // disponível para gastar (já desconta os gastos que vão cair)
  quantosRecentes?: number;
}) {
  const deHoje = passados.filter((p) => p.data === hoje);
  const antes = passados.filter((p) => p.data < hoje).sort((a, b) => b.data.localeCompare(a.data));
  const futuros = [...proximos].sort((a, b) => a.data.localeCompare(b.data) || Number(b.entrada) - Number(a.entrada));
  const entradasPrevistas = futuros.filter((f) => f.entrada).reduce((s, f) => s + f.valor, 0);
  return {
    hoje: deHoje,
    recentes: antes.slice(0, quantosRecentes),
    maisAntigos: Math.max(0, antes.length - quantosRecentes),
    proximos: futuros,
    fimDoMes: {
      disponivel,
      // Se as entradas previstas caírem, sobra isso. O disponível não conta com elas (4.9).
      comEntradasPrevistas: disponivel + entradasPrevistas,
      entradasPrevistas,
    },
  };
}
