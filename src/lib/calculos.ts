// Cálculos do dinheiro (CLAUDE.md, seção 6). Funções puras, sem banco e sem tela: tudo em centavos.

export type LancamentoCalculo = {
  tipo: "gasto" | "entrada";
  valor: number;
  subtipoEntrada: string | null;
  status: "estimado" | "confirmado";
  formaTipo?: string | null; // "beneficio" = pago com vale alimentação
};

export type EmprestimoCalculo = {
  valor: number;
  direcao: "a_receber" | "a_pagar";
  quitado: boolean;
};

// Estimado (fixa variável ainda sem valor real) nunca entra no saldo real (4.8)
const confirmados = (lista: LancamentoCalculo[]) => lista.filter((l) => l.status === "confirmado");

const somar = (lista: { valor: number }[]) => lista.reduce((total, l) => total + l.valor, 0);

// VA é saldo à parte (4.13): o que entrou de VA e o que foi pago com ele
const entradaDeVA = (l: LancamentoCalculo) => l.tipo === "entrada" && l.subtipoEntrada === "beneficio";
const pagoComVA = (l: LancamentoCalculo) => l.tipo === "gasto" && l.formaTipo === "beneficio";

export function totalGasto(lancamentos: LancamentoCalculo[]): number {
  return somar(confirmados(lancamentos).filter((l) => l.tipo === "gasto" && !pagoComVA(l)));
}

// Empréstimo recebido não é renda (4.6), e VA também não é dinheiro livre (4.13)
export function totalEntradas(lancamentos: LancamentoCalculo[]): number {
  return somar(
    confirmados(lancamentos).filter(
      (l) => l.tipo === "entrada" && l.subtipoEntrada !== "emprestimo" && !entradaDeVA(l),
    ),
  );
}

export function saldoReal(lancamentos: LancamentoCalculo[]): number {
  return totalEntradas(lancamentos) - totalGasto(lancamentos);
}

export function saldoEmCaixa(lancamentos: LancamentoCalculo[], emprestimos: EmprestimoCalculo[]): number {
  const emAberto = emprestimos.filter((e) => !e.quitado);
  const aReceber = somar(emAberto.filter((e) => e.direcao === "a_receber"));
  const aPagar = somar(emAberto.filter((e) => e.direcao === "a_pagar"));
  return saldoReal(lancamentos) + aReceber - aPagar;
}

// Passe o histórico inteiro até a data que quer ver: o que sobra de VA passa pro mês seguinte
export function saldoVA(lancamentos: LancamentoCalculo[]): number {
  const lista = confirmados(lancamentos);
  return somar(lista.filter(entradaDeVA)) - somar(lista.filter(pagoComVA));
}

export function resumoDoMes(lancamentos: LancamentoCalculo[], emprestimos: EmprestimoCalculo[] = []) {
  return {
    entradas: totalEntradas(lancamentos),
    gasto: totalGasto(lancamentos),
    saldoReal: saldoReal(lancamentos),
    saldoEmCaixa: saldoEmCaixa(lancamentos, emprestimos),
  };
}
