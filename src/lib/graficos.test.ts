import { describe, expect, it } from "vitest";
import { fluxoDoMes, mapaDeCalor, maioresViloes, porDiaDaSemana, porFormaPagamento } from "./graficos";

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

describe("mapa de calor", () => {
  it("níveis de 0 a 4 pelo maior dia", () => {
    const m = mapaDeCalor(
      [l("2026-09-01", "gasto", 1000), l("2026-09-02", "gasto", 4000), l("2026-09-03", "gasto", 2000), l("2026-09-04", "gasto", 100)],
      set,
    );
    expect(m.dias).toHaveLength(30);
    expect(m.dias.slice(0, 5).map((d) => d.nivel)).toEqual([1, 4, 2, 1, 0]);
    expect(m.maior).toBe(4000);
  });

  it("setembro/2026 começa numa terça: 2 casas vazias", () => {
    expect(mapaDeCalor([], set).vazias).toBe(2);
  });

  it("mês sem gasto fica todo no nível 0", () => {
    expect(mapaDeCalor([l("2026-09-05", "entrada", 5000)], set).dias.every((d) => d.nivel === 0)).toBe(true);
  });
});

import { comparacaoCategorias, porBanco, ritmoDoMes } from "./graficos";

describe("análises novas do mês", () => {
  const g = (data: string, valor: number, extra = {}) => ({ data, valor, tipo: "gasto" as const, status: "confirmado" as const, subtipoEntrada: null, formaTipo: null, ...extra });

  it("ritmo: acumulado deste mês até hoje x mês passado inteiro", () => {
    const r = ritmoDoMes([g("2026-10-01", 100), g("2026-10-03", 50)], [g("2026-09-02", 70), g("2026-09-30", 30)], { ano: 2026, mes: 10 }, { ano: 2026, mes: 9 }, 3);
    expect(r).toHaveLength(31);
    expect(r.slice(0, 4)).toEqual([
      { dia: 1, atual: 100, anterior: 0 },
      { dia: 2, atual: 100, anterior: 70 },
      { dia: 3, atual: 150, anterior: 70 },
      { dia: 4, atual: null, anterior: 70 },
    ]);
    expect(r[29]).toEqual({ dia: 30, atual: null, anterior: 100 });
    expect(r[30]).toEqual({ dia: 31, atual: null, anterior: null });
  });

  it("categorias que mais mudaram, maior diferença primeiro", () => {
    const r = comparacaoCategorias(new Map([["a", 500], ["b", 100]]), new Map([["a", 200], ["b", 400], ["c", 50]]), new Map([["a", "Mercado"], ["b", "Comida"], ["c", "Lazer"]]));
    expect(r.map((c) => [c.nome, c.diferenca])).toEqual([["Comida", -300], ["Mercado", 300], ["Lazer", -50]]);
  });

  it("por banco inclui o VA (Alelo) e deixa de fora o que não é de verdade", () => {
    const r = porBanco([
      { ...g("2026-10-01", 300), contaNome: "Itaú" },
      { ...g("2026-10-01", 100, { formaTipo: "beneficio" }), contaNome: "Alelo" },
      { ...g("2026-10-02", 999, { status: "a_pagar" }), contaNome: "C6" },
      { ...g("2026-10-02", 100), contaNome: null },
    ]);
    expect(r.map((b) => [b.nome, b.valor, b.fracao])).toEqual([["Itaú", 300, 0.6], ["Alelo", 100, 0.2], ["Sem banco", 100, 0.2]]);
  });
});
