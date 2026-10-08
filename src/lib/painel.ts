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
