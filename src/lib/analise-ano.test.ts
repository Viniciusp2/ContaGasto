import { describe, expect, it } from "vitest";
import { formatarCentavos as R } from "./dinheiro";
import { diasCorridos, diasQueMaisGastou, distribuicao, gastoPorMes, padroesDoAno } from "./analise-ano";

const g = (data: string, valor: number, descricao = "Mercado", extra = {}) => ({
  data, valor, descricao, tipo: "gasto" as const, status: "confirmado" as const, subtipoEntrada: null, formaTipo: null, ...extra,
});
const e = (data: string, valor: number) => ({ ...g(data, valor, "Salário"), tipo: "entrada" as const, subtipoEntrada: "salario" as const });

describe("gastoPorMes", () => {
  it("soma por mês só o que conta (sem VA, sem estimado)", () => {
    const meses = gastoPorMes(
      [g("2026-01-05", 1000), g("2026-01-20", 500), g("2026-02-01", 300, "VA", { formaTipo: "beneficio" }), g("2026-02-02", 200, "Luz", { status: "estimado" }), e("2026-02-05", 5000)],
      3,
    );
    expect(meses.map((m) => [m.rotulo, m.gasto, m.entradas])).toEqual([["jan", 1500, 0], ["fev", 0, 5000], ["mar", 0, 0]]);
  });
});

describe("diasQueMaisGastou", () => {
  it("ordena os dias pelo total e diz o maior lançamento de cada um", () => {
    const dias = diasQueMaisGastou([g("2026-04-12", 125000, "Aluguel"), g("2026-04-12", 2000, "Padaria"), g("2026-05-03", 30000), g("2026-05-04", 100)], 2);
    expect(dias).toEqual([
      { data: "2026-04-12", total: 127000, compras: 2, maior: { descricao: "Aluguel", valor: 125000 } },
      { data: "2026-05-03", total: 30000, compras: 1, maior: { descricao: "Mercado", valor: 30000 } },
    ]);
  });
});

describe("distribuicao e padrões", () => {
  // 2026-08-08 é sábado, 2026-08-09 domingo
  const lista = [
    g("2026-08-08", 40000),
    g("2026-08-09", 30000),
    g("2026-08-03", 10000),
    ...Array.from({ length: 12 }, (_, i) => g(`2026-08-${String(i + 1).padStart(2, "0")}`, 1000, "Café")),
    g("2026-07-10", 20000),
    e("2026-07-05", 100000),
    e("2026-08-05", 50000),
  ];

  it("separa quinzena, fim de semana e compras pequenas", () => {
    const d = distribuicao(lista);
    expect(d.total).toBe(112000);
    expect(d.primeiraQuinzena).toBe(112000);
    expect(d.qtdPequenos).toBe(12);
  });

  it("frases só pros padrões que existem", () => {
    const frases = padroesDoAno(lista, 9, 9);
    expect(frases[0]).toBe(`Mês mais caro: agosto, com ${R(92000)} (64% acima da sua média de ${R(56000)} por mês).`);
    expect(frases).toContain(`Mês mais tranquilo: julho, com ${R(20000)}.`);
    expect(frases).toContain("Em 1 mês você gastou mais do que recebeu: agosto.");
    expect(frases).toContain("100% dos gastos caem do dia 1 ao 15: o dinheiro vai embora logo no começo do mês.");
    expect(frases.some((f) => f.startsWith("Fim de semana concentra"))).toBe(true);
    expect(frases.some((f) => f.startsWith("Compras pequenas"))).toBe(true);
  });

  it("sem gasto, nenhuma frase", () => {
    expect(padroesDoAno([e("2026-01-05", 1000)], 3)).toEqual([]);
  });
});

it("dias corridos no ano, parando hoje no mês atual", () => {
  expect(diasCorridos(2026, 2)).toBe(59);
  expect(diasCorridos(2026, 10, "2026-10-07")).toBe(273 + 7);
});
