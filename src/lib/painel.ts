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
// (só gastos avulsos, pra um aluguel não ser multiplicado pelos dias).
export function previsaoDoMes({
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
  const diasDepoisDeHoje = diasNoMes(mes) - diaHoje;
  const ritmoDiario = avulsoAteHoje / diaHoje;
  return gastoAteHoje + compromissos + Math.round(ritmoDiario * diasDepoisDeHoje);
}
