// Dados dos gráficos (Sprint 3.2). Mesmas regras do mês: sem estimado, empréstimo e VA.
import { contaComoEntrada, contaComoGasto, type LancamentoCalculo } from "./calculos";
import { diasNoMes, type Mes } from "./datas";

type Lanc = LancamentoCalculo & { data: string };

// Saldo real acumulado dia a dia, até "ateDia" (hoje, no mês atual)
export function fluxoDoMes(lancamentos: Lanc[], mes: Mes, ateDia = diasNoMes(mes)) {
  const porDia = new Array(diasNoMes(mes) + 1).fill(0);
  for (const l of lancamentos) {
    const dia = Number(l.data.slice(8, 10));
    if (contaComoEntrada(l)) porDia[dia] += l.valor;
    else if (contaComoGasto(l)) porDia[dia] -= l.valor;
  }
  const pontos: { dia: number; saldo: number }[] = [];
  let saldo = 0;
  for (let dia = 1; dia <= ateDia; dia++) {
    saldo += porDia[dia];
    pontos.push({ dia, saldo });
  }
  return pontos;
}

// Top N categorias; o resto vira "Outras" pra lista não crescer sem fim
export function maioresViloes(
  gastos: Map<string, number>,
  nomes: Map<string, string>,
  quantos = 5,
): { nome: string; valor: number }[] {
  const ordenado = [...gastos.entries()].sort((a, b) => b[1] - a[1]);
  const topo = ordenado.slice(0, quantos).map(([id, valor]) => ({ nome: nomes.get(id) ?? "Categoria", valor }));
  const resto = ordenado.slice(quantos).reduce((s, [, v]) => s + v, 0);
  return resto > 0 ? [...topo, { nome: "Outras", valor: resto }] : topo;
}

export function porFormaPagamento(lancamentos: (Lanc & { formaNome: string | null })[]) {
  const mapa = new Map<string, number>();
  for (const l of lancamentos) {
    if (!contaComoGasto(l)) continue;
    const nome = l.formaNome ?? "Sem forma";
    mapa.set(nome, (mapa.get(nome) ?? 0) + l.valor);
  }
  const total = [...mapa.values()].reduce((s, v) => s + v, 0);
  return [...mapa.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([nome, valor]) => ({ nome, valor, fracao: total > 0 ? valor / total : 0 }));
}

const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function porDiaDaSemana(lancamentos: Lanc[]) {
  const soma = new Array(7).fill(0);
  for (const l of lancamentos) {
    if (!contaComoGasto(l)) continue;
    soma[new Date(`${l.data}T00:00:00Z`).getUTCDay()] += l.valor;
  }
  return SEMANA.map((dia, i) => ({ dia, valor: soma[i] }));
}
