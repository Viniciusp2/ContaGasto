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

// Ritmo do mês: gasto acumulado dia a dia, este mês x mês passado (mesmo dia do mês lado a lado).
// O mês atual para em "ateDia" (hoje); o passado vai até o fim dele.
export function ritmoDoMes(atual: Lanc[], anterior: Lanc[], mes: Mes, mesAnterior: Mes, ateDia = diasNoMes(mes)) {
  const acumular = (lista: Lanc[], dias: number) => {
    const porDia = new Array(dias + 1).fill(0);
    for (const l of lista) if (contaComoGasto(l)) porDia[Number(l.data.slice(8, 10))] += l.valor;
    let soma = 0;
    return porDia.map((v) => (soma += v));
  };
  const a = acumular(atual, diasNoMes(mes));
  const p = acumular(anterior, diasNoMes(mesAnterior));
  const total = Math.max(diasNoMes(mes), diasNoMes(mesAnterior));
  return Array.from({ length: total }, (_, i) => ({
    dia: i + 1,
    atual: i + 1 <= ateDia && i + 1 <= diasNoMes(mes) ? a[i + 1] : null,
    anterior: i + 1 <= diasNoMes(mesAnterior) ? p[i + 1] : null,
  }));
}

// Categorias que mais mudaram em relação ao mês passado (positivo = gastou mais)
export function comparacaoCategorias(atual: Map<string, number>, anterior: Map<string, number>, nomes: Map<string, string>, quantos = 6) {
  const ids = new Set([...atual.keys(), ...anterior.keys()]);
  return [...ids]
    .map((id) => ({ nome: nomes.get(id) ?? "Categoria", atual: atual.get(id) ?? 0, anterior: anterior.get(id) ?? 0 }))
    .map((c) => ({ ...c, diferenca: c.atual - c.anterior }))
    .filter((c) => c.diferenca !== 0)
    .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca) || a.nome.localeCompare(b.nome))
    .slice(0, quantos);
}

// De qual banco saiu o dinheiro. Aqui o que foi pago com o VA entra (é o banco "Alelo"); estimado e a pagar não.
export function porBanco(lancamentos: (Lanc & { contaNome: string | null })[]) {
  const mapa = new Map<string, number>();
  for (const l of lancamentos) {
    if (l.tipo !== "gasto" || l.status !== "confirmado") continue;
    const nome = l.contaNome ?? "Sem banco";
    mapa.set(nome, (mapa.get(nome) ?? 0) + l.valor);
  }
  const total = [...mapa.values()].reduce((s, v) => s + v, 0);
  return [...mapa.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([nome, valor]) => ({ nome, valor, fracao: total > 0 ? valor / total : 0 }));
}
