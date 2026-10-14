// Painel do Início (Sprint 3.3): disponível, posso gastar por dia, previsão. Funções puras, em centavos.
import { diasNoMes, type Mes } from "./datas";

// Disponível para gastar (4.9): saldo real menos o que foi guardado no mês e o que ainda vai cair
export function disponivelParaGastar(saldoReal: number, guardadoNoMes: number, compromissos: number): number {
  return saldoReal - guardadoNoMes - compromissos;
}

// Posso gastar por dia: dias restantes contando hoje. Sem folga quando o disponível é zero ou negativo.
export function possoGastarPorDia(disponivel: number, hoje: string, mes: Mes) {
  const diasRestantes = diasNoMes(mes) - Number(hoje.slice(8, 10)) + 1;
  if (disponivel <= 0) return { porDia: null, diasRestantes };
  return { porDia: Math.floor(disponivel / diasRestantes), diasRestantes };
}

// Previsão de gasto no fim do mês: o que já saiu + o que ainda vai cair + o ritmo do dia a dia
// (só gastos avulsos, pra um aluguel não ser multiplicado pelos dias). As partes aparecem no cartão ao tocar.
export function partesDaPrevisao({
  gastoAteHoje,
  avulsoAteHoje,
  compromissos,
  hoje,
  mes,
}: {
  gastoAteHoje: number;
  avulsoAteHoje: number;
  compromissos: number;
  hoje: string;
  mes: Mes;
}) {
  const diaHoje = Number(hoje.slice(8, 10));
  const diasQueFaltam = diasNoMes(mes) - diaHoje;
  const ritmoDiario = Math.round(avulsoAteHoje / diaHoje);
  const diaADia = Math.round((avulsoAteHoje / diaHoje) * diasQueFaltam);
  return { jaSaiu: gastoAteHoje, aindaVaiCair: compromissos, ritmoDiario, diasQueFaltam, diaADia, total: gastoAteHoje + compromissos + diaADia };
}

export function previsaoDoMes(entrada: Parameters<typeof partesDaPrevisao>[0]) {
  return partesDaPrevisao(entrada).total;
}

// Assinaturas que estão no histórico mas não são fixo (ex.: Netflix e Spotify vindos do extrato).
// Cobrança da categoria Assinaturas nos últimos 45 dias, a mais recente de cada nome, que ainda não tem fixo igual.
export const JANELA_ASSINATURA = 45;

export function assinaturasDoHistorico(
  lancs: { id: string; data: string; valor: number; descricao: string; recorrenciaId: string | null }[],
  fixos: string[], // descrições dos fixos ativos em Assinaturas
  hoje: string,
) {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  const limite = new Date(Date.UTC(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)) - 1, Number(hoje.slice(8, 10)) - JANELA_ASSINATURA))
    .toISOString()
    .slice(0, 10);
  const jaFixos = new Set(fixos.map(norm));
  const ultima = new Map<string, (typeof lancs)[number]>();
  for (const l of lancs) {
    if (l.recorrenciaId || l.data < limite || l.data > hoje || jaFixos.has(norm(l.descricao))) continue;
    const atual = ultima.get(norm(l.descricao));
    if (!atual || l.data > atual.data) ultima.set(norm(l.descricao), l);
  }
  return [...ultima.values()].sort((a, b) => b.valor - a.valor);
}

// Plano até o fim do mês com base no dinheiro dos bancos (pedido em 08/10/2026).
// Livre = nas contas hoje - o que ainda falta pagar no mês - o que está guardado nos objetivos (o dinheiro da caixinha
// continua no banco, mas já tem destino). Dividido pelos dias que faltam (contando hoje), dá o máximo por dia e por semana.
// Ritmo = média do dia a dia nos últimos 30 dias (sem contas, que já estão no "falta pagar"): diz até quando o dinheiro dura.
export const DIAS_RITMO = 30;

export function planoAteFimDoMes({
  nasContas,
  faltaPagar,
  guardadoObjetivos,
  gastoDiaADia30Dias,
  hoje,
  mes,
}: {
  nasContas: number;
  faltaPagar: number;
  guardadoObjetivos: number;
  gastoDiaADia30Dias: number;
  hoje: string;
  mes: Mes;
}) {
  const diaHoje = Number(hoje.slice(8, 10));
  const diasRestantes = diasNoMes(mes) - diaHoje + 1;
  const livre = nasContas - faltaPagar - guardadoObjetivos;
  const porDia = livre > 0 ? Math.floor(livre / diasRestantes) : null;
  const porSemana = porDia === null ? null : Math.min(porDia * 7, livre);
  const ritmoDiario = Math.round(gastoDiaADia30Dias / DIAS_RITMO);

  // No ritmo de agora: dá até o fim do mês (e sobra quanto) ou acaba em que dia
  const gastoAteOFim = ritmoDiario * diasRestantes;
  const sobraNoFim = livre - gastoAteOFim;
  let acabaNoDia: number | null = null;
  if (sobraNoFim < 0) acabaNoDia = livre <= 0 || ritmoDiario === 0 ? diaHoje : diaHoje + Math.floor(livre / ritmoDiario);
  return { livre, diasRestantes, porDia, porSemana, ritmoDiario, sobraNoFim, acabaNoDia };
}

// O que entra no "dia a dia" do ritmo: gasto confirmado, fora do VA e que não é conta (luz, aluguel, assinatura...).
export function entraNoDiaADia(l: { tipo: string; status: string; formaTipo: string | null; ehConta: boolean }) {
  return l.tipo === "gasto" && l.status === "confirmado" && l.formaTipo !== "beneficio" && !l.ehConta;
}
