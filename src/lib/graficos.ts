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

// Mapa de calor: gasto de cada dia do mês em 5 níveis (0 = nada, 4 = o dia que mais gastou)
export function mapaDeCalor(lancamentos: Lanc[], mes: Mes) {
  const total = diasNoMes(mes);
  const soma = new Array(total + 1).fill(0);
  for (const l of lancamentos) {
    if (contaComoGasto(l)) soma[Number(l.data.slice(8, 10))] += l.valor;
  }
  const maior = Math.max(...soma, 0);
  const prefixo = `${mes.ano}-${String(mes.mes).padStart(2, "0")}`;
  const dias = Array.from({ length: total }, (_, i) => {
    const valor = soma[i + 1];
    const nivel = valor === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((valor / maior) * 4)));
    return { dia: i + 1, data: `${prefixo}-${String(i + 1).padStart(2, "0")}`, valor, nivel };
  });
  // Quantas casas vazias antes do dia 1 (a semana começa no domingo)
  const vazias = new Date(Date.UTC(mes.ano, mes.mes - 1, 1)).getUTCDay();
  return { dias, vazias, maior };
}
