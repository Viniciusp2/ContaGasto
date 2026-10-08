// Análise do ano (Sprint 6.3): meses e dias que mais pesaram e os padrões dos gastos.
// Mesmas regras do mês: só gasto confirmado, sem VA (contaComoGasto); entrada sem empréstimo e sem VA.
import { contaComoEntrada, contaComoGasto, type LancamentoCalculo } from "./calculos";
import { diasNoMes } from "./datas";
import { formatarCentavos } from "./dinheiro";

type Lanc = LancamentoCalculo & { data: string; descricao: string };

export const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const SEMANA_LONGA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const LIMITE_PEQUENO = 3000; // compra pequena: até R$ 30

const pct = (parte: number, todo: number) => (todo > 0 ? Math.round((parte / todo) * 100) : 0);

// Gasto e entrada de cada mês, de janeiro até "ateMes"
export function gastoPorMes(lancamentos: Lanc[], ateMes: number) {
  const meses = Array.from({ length: ateMes }, (_, i) => ({ mes: i + 1, rotulo: MESES_CURTOS[i], gasto: 0, entradas: 0 }));
  for (const l of lancamentos) {
    const m = Number(l.data.slice(5, 7));
    if (m < 1 || m > ateMes) continue;
    if (contaComoGasto(l)) meses[m - 1].gasto += l.valor;
    else if (contaComoEntrada(l)) meses[m - 1].entradas += l.valor;
  }
  return meses;
}

// Os dias do ano que mais pesaram, com o maior lançamento de cada um (o "culpado")
export function diasQueMaisGastou(lancamentos: Lanc[], quantos = 5) {
  const dias = new Map<string, { total: number; maior: { descricao: string; valor: number } | null; compras: number }>();
  for (const l of lancamentos) {
    if (!contaComoGasto(l)) continue;
    const d = dias.get(l.data) ?? { total: 0, maior: null, compras: 0 };
    d.total += l.valor;
    d.compras++;
    if (!d.maior || l.valor > d.maior.valor) d.maior = { descricao: l.descricao, valor: l.valor };
    dias.set(l.data, d);
  }
  return [...dias.entries()]
    .sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]))
    .slice(0, quantos)
    .map(([data, d]) => ({ data, ...d }));
}

// Quanto do gasto cai em cada parte do mês e da semana
export function distribuicao(lancamentos: Lanc[]) {
  let total = 0,
    primeiraQuinzena = 0,
    fimDeSemana = 0,
    pequenos = 0,
    qtdPequenos = 0;
  const semana = new Array(7).fill(0);
  for (const l of lancamentos) {
    if (!contaComoGasto(l)) continue;
    total += l.valor;
    if (Number(l.data.slice(8, 10)) <= 15) primeiraQuinzena += l.valor;
    const dia = new Date(`${l.data}T00:00:00Z`).getUTCDay();
    semana[dia] += l.valor;
    if (dia === 0 || dia === 6) fimDeSemana += l.valor;
    if (l.valor <= LIMITE_PEQUENO) {
      pequenos += l.valor;
      qtdPequenos++;
    }
  }
  return { total, primeiraQuinzena, fimDeSemana, pequenos, qtdPequenos, semana };
}

// Frases curtas com o que dá pra notar. Só entra o que for de fato um padrão (nada de frase vazia).
export function padroesDoAno(lancamentos: Lanc[], ateMes: number, mesEmAndamento?: number) {
  const frases: string[] = [];
  const meses = gastoPorMes(lancamentos, ateMes);
  // Mês em andamento ainda não acabou: fica fora da média e do "mais caro/barato"
  const fechados = meses.filter((m) => m.mes !== mesEmAndamento && m.gasto > 0);
  const d = distribuicao(lancamentos);
  if (d.total === 0) return frases;

  if (fechados.length >= 2) {
    const media = Math.round(fechados.reduce((s, m) => s + m.gasto, 0) / fechados.length);
    const caro = fechados.reduce((a, b) => (b.gasto > a.gasto ? b : a));
    const barato = fechados.reduce((a, b) => (b.gasto < a.gasto ? b : a));
    frases.push(
      `Mês mais caro: ${MESES_LONGOS[caro.mes - 1]}, com ${formatarCentavos(caro.gasto)} (${pct(caro.gasto - media, media)}% acima da sua média de ${formatarCentavos(media)} por mês).`,
    );
    if (barato.mes !== caro.mes) frases.push(`Mês mais tranquilo: ${MESES_LONGOS[barato.mes - 1]}, com ${formatarCentavos(barato.gasto)}.`);
  }

  const vermelho = meses.filter((m) => m.mes !== mesEmAndamento && m.entradas > 0 && m.gasto > m.entradas);
  if (vermelho.length > 0) {
    frases.push(
      `Em ${vermelho.length === 1 ? "1 mês" : `${vermelho.length} meses`} você gastou mais do que recebeu: ${vermelho.map((m) => MESES_LONGOS[m.mes - 1]).join(", ")}.`,
    );
  }

  const maiorDia = d.semana.indexOf(Math.max(...d.semana));
  const fatia = pct(d.semana[maiorDia], d.total);
  if (fatia >= 20) frases.push(`${SEMANA_LONGA[maiorDia][0].toUpperCase()}${SEMANA_LONGA[maiorDia].slice(1)} é o dia que mais pesa: ${fatia}% de tudo que você gastou.`);

  const quinzena = pct(d.primeiraQuinzena, d.total);
  if (quinzena >= 60) frases.push(`${quinzena}% dos gastos caem do dia 1 ao 15: o dinheiro vai embora logo no começo do mês.`);
  else if (quinzena <= 40) frases.push(`${100 - quinzena}% dos gastos ficam pra segunda metade do mês.`);

  const fds = pct(d.fimDeSemana, d.total);
  if (fds >= 40) frases.push(`Fim de semana concentra ${fds}% dos gastos, sendo só 2 dos 7 dias.`);

  if (d.qtdPequenos >= 10) {
    frases.push(
      `Compras pequenas (até ${formatarCentavos(LIMITE_PEQUENO)}) foram ${d.qtdPequenos} e somaram ${formatarCentavos(d.pequenos)}: ${pct(d.pequenos, d.total)}% do total.`,
    );
  }
  return frases;
}

// Dias do mês que sobram no fim do ano (pra média por dia no mês em andamento)
export function diasCorridos(ano: number, ateMes: number, hoje?: string) {
  let dias = 0;
  for (let m = 1; m <= ateMes; m++) dias += diasNoMes({ ano, mes: m });
  if (hoje && Number(hoje.slice(0, 4)) === ano && Number(hoje.slice(5, 7)) === ateMes) {
    dias -= diasNoMes({ ano, mes: ateMes }) - Number(hoje.slice(8, 10));
  }
  return dias;
}
