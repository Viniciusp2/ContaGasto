import { describe, expect, it } from "vitest";
import {
  resumoDoMes,
  saldoEmCaixa,
  saldoReal,
  totalEntradas,
  totalGasto,
  type EmprestimoCalculo,
  type LancamentoCalculo,
} from "./calculos";

const gasto = (valor: number, status: "estimado" | "confirmado" = "confirmado"): LancamentoCalculo => ({
  tipo: "gasto",
  valor,
  subtipoEntrada: null,
  status,
});

const entrada = (valor: number, subtipoEntrada = "salario"): LancamentoCalculo => ({
  tipo: "entrada",
  valor,
  subtipoEntrada,
  status: "confirmado",
});

const emprestimo = (
  valor: number,
  direcao: EmprestimoCalculo["direcao"],
  quitado = false,
): EmprestimoCalculo => ({ valor, direcao, quitado });

describe("mês vazio", () => {
  it("tudo zerado", () => {
    expect(resumoDoMes([])).toEqual({ entradas: 0, gasto: 0, saldoReal: 0, saldoEmCaixa: 0 });
  });
});

describe("totalGasto", () => {
  it("soma os gastos em centavos, sem erro de float", () => {
    // 0,10 + 0,20 em float dá 0,30000000000000004. Em centavos, 30.
    expect(totalGasto([gasto(10), gasto(20)])).toBe(30);
    expect(totalGasto([gasto(4590), gasto(12000), gasto(1)])).toBe(16591);
  });

  it("ignora entradas", () => {
    expect(totalGasto([gasto(1000), entrada(5000)])).toBe(1000);
  });

  it("gasto estimado (fixa variável) não conta", () => {
    expect(totalGasto([gasto(1000), gasto(12800, "estimado")])).toBe(1000);
  });
});

describe("totalEntradas", () => {
  it("soma salário, extra, presente e reembolso", () => {
    const lista = [entrada(250000), entrada(30000, "extra"), entrada(5000, "doacao"), entrada(1990, "reembolso")];
    expect(totalEntradas(lista)).toBe(286990);
  });

  it("empréstimo recebido não é renda", () => {
    expect(totalEntradas([entrada(250000), entrada(100000, "emprestimo")])).toBe(250000);
  });

  it("ignora gastos", () => {
    expect(totalEntradas([entrada(1000), gasto(500)])).toBe(1000);
  });
});

describe("saldoReal", () => {
  it("entradas menos gastos", () => {
    expect(saldoReal([entrada(250000), gasto(4590), gasto(120000)])).toBe(125410);
  });

  it("pode ficar negativo", () => {
    expect(saldoReal([entrada(1000), gasto(5000)])).toBe(-4000);
  });

  it("empréstimo recebido não infla o saldo real", () => {
    expect(saldoReal([entrada(100000, "emprestimo"), gasto(20000)])).toBe(-20000);
  });
});

describe("saldoEmCaixa", () => {
  const lancamentos = [entrada(250000), gasto(50000)]; // saldo real 2.000,00

  it("sem empréstimos é igual ao saldo real", () => {
    expect(saldoEmCaixa(lancamentos, [])).toBe(200000);
  });

  it("soma o que te devem e tira o que você deve", () => {
    const emprestimos = [emprestimo(30000, "a_receber"), emprestimo(10000, "a_pagar")];
    expect(saldoEmCaixa(lancamentos, emprestimos)).toBe(220000);
  });

  it("empréstimo quitado não conta mais", () => {
    const emprestimos = [emprestimo(30000, "a_receber", true), emprestimo(10000, "a_pagar", true)];
    expect(saldoEmCaixa(lancamentos, emprestimos)).toBe(200000);
  });
});

describe("resumoDoMes", () => {
  it("junta tudo num lugar só", () => {
    const lancamentos = [entrada(250000), entrada(100000, "emprestimo"), gasto(4590), gasto(9990, "estimado")];
    expect(resumoDoMes(lancamentos, [emprestimo(5000, "a_pagar")])).toEqual({
      entradas: 250000,
      gasto: 4590,
      saldoReal: 245410,
      saldoEmCaixa: 240410,
    });
  });
});
