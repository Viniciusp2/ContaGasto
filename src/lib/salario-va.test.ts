import { describe, expect, it } from "vitest";
import { resumoDoMes, saldoVA, type LancamentoCalculo } from "./calculos";
import { diaUtilDoMes, ehDiaUtil, ehFeriadoNacional, pascoa } from "./dias-uteis";
import { lerHolerite, liquidoDoHolerite } from "./holerite";
import { descreverDia, ocorrencia, ocorrenciasPendentes, primeiroDiaUtilAPartirDe, type RecorrenciaBase } from "./recorrencias";

describe("feriados", () => {
  it("Páscoa em anos conhecidos", () => {
    expect(pascoa(2026)).toBe("2026-04-05");
    expect(pascoa(2027)).toBe("2027-03-28");
    expect(pascoa(2025)).toBe("2025-04-20");
  });

  it("feriados nacionais fixos e Sexta-feira Santa", () => {
    expect(ehFeriadoNacional("2026-09-07")).toBe(true);
    expect(ehFeriadoNacional("2026-11-20")).toBe(true);
    expect(ehFeriadoNacional("2026-04-03")).toBe(true); // Sexta Santa 2026
    expect(ehFeriadoNacional("2026-09-08")).toBe(false);
  });

  it("Carnaval não é feriado nacional", () => {
    expect(ehFeriadoNacional("2026-02-17")).toBe(false);
  });
});

describe("dia útil", () => {
  it("domingo nunca, sábado depende", () => {
    expect(ehDiaUtil("2026-09-06", true)).toBe(false); // domingo
    expect(ehDiaUtil("2026-09-05", true)).toBe(true); // sábado contando
    expect(ehDiaUtil("2026-09-05", false)).toBe(false);
    expect(ehDiaUtil("2026-09-07", true)).toBe(false); // feriado
  });

  it("5º dia útil de setembro/2026", () => {
    // 1 ter, 2 qua, 3 qui, 4 sex, 5 sáb, 7 é feriado
    expect(diaUtilDoMes({ ano: 2026, mes: 9 }, 5, true)).toBe("2026-09-05");
    expect(diaUtilDoMes({ ano: 2026, mes: 9 }, 5, false)).toBe("2026-09-08");
  });

  it("5º dia útil de janeiro/2027 pula o Ano Novo", () => {
    expect(diaUtilDoMes({ ano: 2027, mes: 1 }, 5, true)).toBe("2027-01-07");
    expect(diaUtilDoMes({ ano: 2027, mes: 1 }, 5, false)).toBe("2027-01-08");
  });

  it("último dia útil", () => {
    // 31/10/2026 é sábado
    expect(diaUtilDoMes({ ano: 2026, mes: 10 }, -1, true)).toBe("2026-10-31");
    expect(diaUtilDoMes({ ano: 2026, mes: 10 }, -1, false)).toBe("2026-10-30");
  });

  it("pedir mais dias úteis do que o mês tem fica no último", () => {
    expect(diaUtilDoMes({ ano: 2026, mes: 2 }, 40, false)).toBe(diaUtilDoMes({ ano: 2026, mes: 2 }, -1, false));
  });
});

describe("salário no 5º dia útil", () => {
  const salario: RecorrenciaBase = {
    tipo: "fixa",
    diaDoMes: 5,
    dataInicio: "2026-09-05",
    dataFim: null,
    totalParcelas: null,
    geradaAte: null,
    diaUtil: 5,
    sabadoUtil: true,
  };

  it("cada mês recalcula o dia útil", () => {
    expect([0, 1, 2, 3, 4].map((k) => ocorrencia(salario, k, null).data)).toEqual([
      "2026-09-05",
      "2026-10-06", // 1 qui, 2 sex, 3 sáb, 5 seg, 6 ter (4 é domingo)
      "2026-11-07", // 1 é domingo, 2 é feriado: 3, 4, 5, 6 e sábado 7
      "2026-12-05",
      "2027-01-07",
    ]);
  });

  it("só vira lançamento quando o dia chega", () => {
    expect(ocorrenciasPendentes(salario, null, "2026-10-05").map((o) => o.data)).toEqual(["2026-09-05"]);
    expect(ocorrenciasPendentes(salario, null, "2026-10-06").length).toBe(2);
  });

  it("criado depois do 5º dia útil começa no mês seguinte", () => {
    expect(primeiroDiaUtilAPartirDe("2026-09-23", 5, true)).toBe("2026-10-06");
    expect(primeiroDiaUtilAPartirDe("2026-09-01", 5, true)).toBe("2026-09-05");
  });

  it("descreve o dia", () => {
    expect(descreverDia(salario)).toBe("5º dia útil");
    expect(descreverDia({ diaUtil: -1, diaDoMes: 30 })).toBe("último dia útil");
    expect(descreverDia({ diaUtil: null, diaDoMes: 25 })).toBe("dia 25");
  });
});

describe("holerite", () => {
  it("líquido = bruto menos descontos", () => {
    expect(liquidoDoHolerite({ bruto: 600000, descontos: [{ nome: "INSS", valor: 66000 }, { nome: "IR", valor: 34000 }] })).toBe(500000);
  });

  it("vazio é sem holerite", () => {
    expect(lerHolerite("")).toEqual({ ok: true, holerite: null });
  });

  it("ignora linhas de desconto em branco", () => {
    const r = lerHolerite(JSON.stringify({ bruto: 300000, descontos: [{ nome: "", valor: 0 }, { nome: " INSS ", valor: 30000 }] }));
    expect(r).toEqual({ ok: true, holerite: { bruto: 300000, descontos: [{ nome: "INSS", valor: 30000 }] } });
  });

  it.each([
    ["JSON quebrado", "{"],
    ["sem bruto", JSON.stringify({ descontos: [] })],
    ["bruto quebrado", JSON.stringify({ bruto: 10.5, descontos: [] })],
    ["desconto sem nome", JSON.stringify({ bruto: 1000, descontos: [{ nome: "", valor: 100 }] })],
    ["desconto negativo", JSON.stringify({ bruto: 1000, descontos: [{ nome: "x", valor: -100 }] })],
    ["descontos iguais ao bruto", JSON.stringify({ bruto: 1000, descontos: [{ nome: "x", valor: 1000 }] })],
  ])("recusa: %s", (_nome, json) => {
    expect(lerHolerite(json).ok).toBe(false);
  });
});

describe("vale alimentação fica fora do saldo real", () => {
  const l = (campos: Partial<LancamentoCalculo>): LancamentoCalculo => ({
    tipo: "gasto",
    valor: 0,
    subtipoEntrada: null,
    status: "confirmado",
    formaTipo: null,
    ...campos,
  });

  const mes = [
    l({ tipo: "entrada", valor: 500000, subtipoEntrada: "salario" }),
    l({ tipo: "entrada", valor: 80000, subtipoEntrada: "beneficio" }), // VA dia 25
    l({ valor: 30000, formaTipo: "beneficio" }), // mercado pago com VA
    l({ valor: 10000, formaTipo: "pix" }), // mercado pago com pix
  ];

  it("VA não conta como entrada nem o que foi pago com ele como gasto", () => {
    expect(resumoDoMes(mes)).toMatchObject({ entradas: 500000, gasto: 10000, saldoReal: 490000 });
  });

  it("saldo do VA = recebido - pago com VA", () => {
    expect(saldoVA(mes)).toBe(50000);
  });

  it("o que sobra passa pro mês seguinte", () => {
    const outubro = [l({ tipo: "entrada", valor: 80000, subtipoEntrada: "beneficio" }), l({ valor: 100000, formaTipo: "beneficio" })];
    expect(saldoVA([...mes, ...outubro])).toBe(30000);
  });
});
