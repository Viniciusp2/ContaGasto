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
  data: string;
  dataQuitacao: string | null;
};

// Em aberto numa data: já tinha sido feito e ainda não tinha sido quitado
export function emAbertoEm(e: EmprestimoCalculo, dataRef: string): boolean {
  if (e.data > dataRef) return false;
  if (!e.quitado) return true;
  return e.dataQuitacao !== null && e.dataQuitacao > dataRef;
}

export function totaisEmprestimos(emprestimos: EmprestimoCalculo[], dataRef: string) {
  const abertos = emprestimos.filter((e) => emAbertoEm(e, dataRef));
  return {
    teDevem: somar(abertos.filter((e) => e.direcao === "a_receber")),
    voceDeve: somar(abertos.filter((e) => e.direcao === "a_pagar")),
  };
}

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

// O que tem na conta (4.6): o que você emprestou saiu dela, o que pegou emprestado entrou
export function saldoEmCaixa(
  lancamentos: LancamentoCalculo[],
  emprestimos: EmprestimoCalculo[],
  dataRef: string,
): number {
  const { teDevem, voceDeve } = totaisEmprestimos(emprestimos, dataRef);
  return saldoReal(lancamentos) - teDevem + voceDeve;
}

// Passe o histórico inteiro até a data que quer ver: o que sobra de VA passa pro mês seguinte
export function saldoVA(lancamentos: LancamentoCalculo[]): number {
  const lista = confirmados(lancamentos);
  return somar(lista.filter(entradaDeVA)) - somar(lista.filter(pagoComVA));
}

// dataRef: fim do mês visto (ou hoje, no mês atual)
export function resumoDoMes(
  lancamentos: LancamentoCalculo[],
  emprestimos: EmprestimoCalculo[] = [],
  dataRef = "9999-12-31",
) {
  return {
    entradas: totalEntradas(lancamentos),
    gasto: totalGasto(lancamentos),
    saldoReal: saldoReal(lancamentos),
    saldoEmCaixa: saldoEmCaixa(lancamentos, emprestimos, dataRef),
    ...totaisEmprestimos(emprestimos, dataRef),
  };
}

// ---------- Metas (4.5) ----------

export type EstadoMeta = "ok" | "atencao" | "estourou";

// Gasto que conta pra meta: confirmado e fora do VA, igual ao total gasto
export function gastoPorCategoria(lancamentos: (LancamentoCalculo & { categoriaId: string })[]) {
  const porCategoria = new Map<string, number>();
  for (const l of confirmados(lancamentos)) {
    if (l.tipo !== "gasto" || pagoComVA(l)) continue;
    const c = l as LancamentoCalculo & { categoriaId: string };
    porCategoria.set(c.categoriaId, (porCategoria.get(c.categoriaId) ?? 0) + l.valor);
  }
  return porCategoria;
}

// Menta até 80%, coral de 80% até o limite, vermelho quando passa do limite
export function progressoMeta(gasto: number, limite: number) {
  const fracao = limite > 0 ? gasto / limite : 0;
  const estado: EstadoMeta = gasto > limite ? "estourou" : fracao >= 0.8 ? "atencao" : "ok";
  return { fracao, estado, falta: Math.max(0, limite - gasto), passou: Math.max(0, gasto - limite) };
}
