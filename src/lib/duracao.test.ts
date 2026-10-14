import { describe, expect, it } from "vitest";
import { diasDeEntrada, mapaDoAno, quantoDura } from "./duracao";

const base = { status: "confirmado" as const, formaTipo: null as string | null, subtipoEntrada: null as string | null };
const gasto = (data: string, valor: number, formaTipo: string | null = null) => ({ ...base, data, valor, tipo: "gasto" as const, formaTipo });
const salario = (data: string, valor: number) => ({ ...base, data, valor, tipo: "entrada" as const, subtipoEntrada: "salario" });
const va = (data: string, valor: number) => ({ ...base, data, valor, tipo: "entrada" as const, subtipoEntrada: "beneficio" });

describe("quantoDura", () => {
  it("salário que acaba: conta os dias do dia que caiu até o gasto que zerou", () => {
    const r = quantoDura([salario("2026-08-06", 200000), gasto("2026-08-08", 100000), gasto("2026-08-15", 120000), salario("2026-09-04", 50000)], "salario", "2026-10-07");
    expect(r.ciclos[0]).toEqual({ data: "2026-08-06", valor: 200000, situacao: "acabou", dias: 10, acabouEm: "2026-08-15", sobrou: 0 });
    expect(r.ciclos[1].situacao).toBe("em_andamento");
    expect(r.mediaDias).toBe(10);
  });

  it("próximo salário chegou antes de acabar: sobrou", () => {
    const r = quantoDura([salario("2026-08-06", 200000), gasto("2026-08-08", 50000), salario("2026-09-04", 50000)], "salario", "2026-10-07");
    expect(r.ciclos[0]).toMatchObject({ situacao: "sobrou", dias: 29, sobrou: 150000 });
    expect(r.mediaDias).toBeNull();
  });

  it("VA: só conta o que foi pago com o VA, e ignora o saldo anterior pequeno", () => {
    const r = quantoDura(
      [va("2026-06-22", 925), va("2026-06-25", 81880), gasto("2026-06-25", 58749, "beneficio"), gasto("2026-06-26", 99999), gasto("2026-06-27", 23131, "beneficio")],
      "va",
      "2026-10-07",
    );
    expect(r.ciclos).toHaveLength(1);
    expect(r.ciclos[0]).toMatchObject({ situacao: "acabou", dias: 3, acabouEm: "2026-06-27" });
  });
});

it("marca os dias do salário e do VA", () => {
  const m = diasDeEntrada([salario("2026-08-06", 1), va("2026-08-25", 74760), va("2026-06-22", 925), gasto("2026-08-07", 1)]);
  expect([...m.entries()]).toEqual([
    ["2026-08-06", { salario: true, va: false }],
    ["2026-08-25", { salario: false, va: true }],
  ]);
});

it("mapa do ano: um mês por bloco, nível pela posição entre os dias com gasto", () => {
  const meses = mapaDoAno([gasto("2026-01-05", 100), gasto("2026-01-06", 200), gasto("2026-01-07", 300), gasto("2026-02-01", 125000)], 2026, 2);
  expect(meses.map((m) => [m.mes, m.vazias, m.dias.length])).toEqual([[1, 4, 31], [2, 0, 28]]);
  expect(meses[0].dias.slice(4, 7).map((d) => d.nivel)).toEqual([1, 2, 3]);
  expect(meses[1].dias[0].nivel).toBe(4);
  expect(meses[0].dias[0].nivel).toBe(0);
});

it("VA que sobra só trocado conta como acabou (95%)", () => {
  const r = quantoDura([va("2026-07-25", 74760), gasto("2026-07-26", 70000, "beneficio"), gasto("2026-08-01", 1200, "beneficio"), va("2026-08-25", 74760)], "va", "2026-10-07");
  expect(r.ciclos[0]).toMatchObject({ situacao: "acabou", dias: 8, acabouEm: "2026-08-01", sobrou: 3560 });
});
