// Cálculos do dinheiro (CLAUDE.md, seção 6). Funções puras, sem banco e sem tela: tudo em centavos.

export type LancamentoCalculo = {
  tipo: "gasto" | "entrada";
  valor: number;
  subtipoEntrada: string | null;
  status: "estimado" | "confirmado";
};

export type EmprestimoCalculo = {
  valor: number;
  direcao: "a_receber" | "a_pagar";
  quitado: boolean;
};

// Estimado (fixa variável ainda sem valor real) nunca entra no saldo real (4.8)
const confirmados = (lista: LancamentoCalculo[]) => lista.filter((l) => l.status === "confirmado");

const somar = (lista: { valor: number }[]) => lista.reduce((total, l) => total + l.valor, 0);

export function totalGasto(lancamentos: LancamentoCalculo[]): number {
  return somar(confirmados(lancamentos).filter((l) => l.tipo === "gasto"));
}

// Empréstimo recebido não é renda (4.6)
export function totalEntradas(lancamentos: LancamentoCalculo[]): number {
  return somar(
    confirmados(lancamentos).filter((l) => l.tipo === "entrada" && l.subtipoEntrada !== "emprestimo"),
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

export function resumoDoMes(lancamentos: LancamentoCalculo[], emprestimos: EmprestimoCalculo[] = []) {
  return {
    entradas: totalEntradas(lancamentos),
    gasto: totalGasto(lancamentos),
    saldoReal: saldoReal(lancamentos),
    saldoEmCaixa: saldoEmCaixa(lancamentos, emprestimos),
  };
}
