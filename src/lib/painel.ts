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
