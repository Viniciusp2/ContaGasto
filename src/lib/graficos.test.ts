import { describe, expect, it } from "vitest";
import { fluxoDoMes, maioresViloes, porDiaDaSemana, porFormaPagamento } from "./graficos";

const l = (data: string, tipo: "gasto" | "entrada", valor: number, extra = {}) => ({
  data,
  tipo,
  valor,
  subtipoEntrada: tipo === "entrada" ? "salario" : null,
  status: "confirmado" as const,
  formaTipo: null as string | null,
  formaNome: null as string | null,
  ...extra,
});
const set = { ano: 2026, mes: 9 };

describe("fluxo do mês", () => {
  const lista = [
    l("2026-09-05", "entrada", 500000),
    l("2026-09-10", "gasto", 150000),
    l("2026-09-10", "gasto", 5000),
    l("2026-09-12", "entrada", 100000, { subtipoEntrada: "emprestimo" }), // fora
    l("2026-09-15", "gasto", 12000, { status: "estimado" }), // fora
    l("2026-09-20", "gasto", 30000, { formaTipo: "beneficio" }), // VA, fora
  ];

  it("saldo acumulado dia a dia", () => {
    const f = fluxoDoMes(lista, set);
    expect(f).toHaveLength(30);
    expect(f[3]).toEqual({ dia: 4, saldo: 0 });
    expect(f[4]).toEqual({ dia: 5, saldo: 500000 });
    expect(f[9]).toEqual({ dia: 10, saldo: 345000 });
    expect(f[29].saldo).toBe(345000);
  });

  it("no mês atual para em hoje", () => {
    expect(fluxoDoMes(lista, set, 23)).toHaveLength(23);
  });
});

describe("maiores vilões", () => {
  const nomes = new Map([["a", "Mercado"], ["b", "Comida"], ["c", "Lazer"], ["d", "Casa"]]);
  const gastos = new Map([["a", 5000], ["b", 9000], ["c", 1000], ["d", 3000]]);

  it("ordena do maior pro menor", () => {
    expect(maioresViloes(gastos, nomes).map((v) => v.nome)).toEqual(["Comida", "Mercado", "Casa", "Lazer"]);
  });

  it("junta o resto em Outras", () => {
    expect(maioresViloes(gastos, nomes, 2)).toEqual([
      { nome: "Comida", valor: 9000 },
      { nome: "Mercado", valor: 5000 },
      { nome: "Outras", valor: 4000 },
    ]);
  });
});

describe("por forma de pagamento", () => {
  it("soma por forma, com porcentagem, e sem forma separado", () => {
    const r = porFormaPagamento([
      l("2026-09-01", "gasto", 7500, { formaNome: "Pix" }),
      l("2026-09-02", "gasto", 2500, { formaNome: null }),
      l("2026-09-03", "gasto", 9999, { formaNome: "Vale alimentação", formaTipo: "beneficio" }), // VA, fora
      l("2026-09-04", "entrada", 50000, { formaNome: "Pix" }), // entrada, fora
    ]);
    expect(r).toEqual([
      { nome: "Pix", valor: 7500, fracao: 0.75 },
      { nome: "Sem forma", valor: 2500, fracao: 0.25 },
    ]);
  });
});

describe("por dia da semana", () => {
  it("soma os gastos por dia da semana", () => {
    // 23/09/2026 é quarta, 26/09 é sábado
    const r = porDiaDaSemana([l("2026-09-23", "gasto", 1000), l("2026-09-30", "gasto", 500), l("2026-09-26", "gasto", 200)]);
    expect(r.find((d) => d.dia === "qua")?.valor).toBe(1500);
    expect(r.find((d) => d.dia === "sáb")?.valor).toBe(200);
    expect(r.map((d) => d.dia)).toEqual(["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]);
  });
});
