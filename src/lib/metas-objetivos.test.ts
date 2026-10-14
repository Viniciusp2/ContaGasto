import { describe, expect, it } from "vitest";
import { gastoPorCategoria, progressoMeta, type LancamentoCalculo } from "./calculos";

const g = (categoriaId: string, valor: number, extra: Partial<LancamentoCalculo> = {}) => ({
  categoriaId,
  tipo: "gasto" as const,
  valor,
  subtipoEntrada: null,
  status: "confirmado" as const,
  formaTipo: null,
  ...extra,
});

describe("metas", () => {
  it("soma o gasto por categoria", () => {
    const m = gastoPorCategoria([g("lazer", 5000), g("lazer", 3000), g("mercado", 10000)]);
    expect(m.get("lazer")).toBe(8000);
    expect(m.get("mercado")).toBe(10000);
  });

  it("ignora estimado, entrada e pago com VA", () => {
    const m = gastoPorCategoria([
      g("contas", 12000, { status: "estimado" }),
      g("mercado", 9000, { formaTipo: "beneficio" }),
      { ...g("salario", 500000), tipo: "entrada" as const },
    ]);
    expect(m.size).toBe(0);
  });

  it("estados da barra", () => {
    expect(progressoMeta(10000, 20000).estado).toBe("ok");
    expect(progressoMeta(15999, 20000).estado).toBe("ok");
    expect(progressoMeta(16000, 20000).estado).toBe("atencao"); // 80%
    expect(progressoMeta(20000, 20000).estado).toBe("atencao"); // bateu o limite, ainda não passou
    expect(progressoMeta(20001, 20000).estado).toBe("estourou");
  });

  it("quanto falta e quanto passou", () => {
    expect(progressoMeta(15000, 20000)).toMatchObject({ falta: 5000, passou: 0, fracao: 0.75 });
    expect(progressoMeta(25000, 20000)).toMatchObject({ falta: 0, passou: 5000 });
  });
});

import { mesesAteOAlvo, planoDoObjetivo, saldoObjetivo, validarMovimento, validarObjetivo } from "./objetivos";

const fd = (campos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
};

describe("objetivos", () => {
  it("saldo é a soma dos movimentos", () => {
    expect(saldoObjetivo([{ valor: 30000 }, { valor: 20000 }, { valor: -5000 }])).toBe(45000);
    expect(saldoObjetivo([])).toBe(0);
  });

  it("meses até o alvo", () => {
    expect(mesesAteOAlvo("2026-09-23", "2026-12-31")).toBe(3);
    expect(mesesAteOAlvo("2026-09-23", "2027-09-01")).toBe(12);
    expect(mesesAteOAlvo("2026-09-23", "2026-09-30")).toBe(1); // mês do alvo
    expect(mesesAteOAlvo("2026-09-23", "2026-05-01")).toBe(1); // já passou
  });

  it("celular de R$ 2.000 até dezembro com R$ 450 guardados", () => {
    const p = planoDoObjetivo(200000, 45000, "2026-09-23", "2026-12-31");
    expect(p).toMatchObject({ falta: 155000, meses: 3, porMes: 51667, concluido: false, prazoPassou: false });
    // arredondado pra cima, 3 meses guardando isso chega no alvo
    expect(p.porMes * 3).toBeGreaterThanOrEqual(155000);
  });

  it("concluído e prazo passado", () => {
    expect(planoDoObjetivo(100000, 120000, "2026-09-23", "2026-12-31")).toMatchObject({ falta: 0, porMes: 0, concluido: true });
    expect(planoDoObjetivo(100000, 50000, "2026-09-23", "2026-08-01")).toMatchObject({ prazoPassou: true, meses: 1, porMes: 50000 });
  });

  it("valida o objetivo", () => {
    const ok = validarObjetivo(fd({ nome: " Celular ", icone: "Smartphone", valorAlvo: "200000", dataAlvo: "2026-12-31" }));
    expect(ok).toEqual({ ok: true, dados: { nome: "Celular", icone: "Smartphone", valorAlvo: 200000, dataAlvo: "2026-12-31" } });
    expect(validarObjetivo(fd({ nome: "", valorAlvo: "100", dataAlvo: "2026-12-31" })).ok).toBe(false);
    expect(validarObjetivo(fd({ nome: "x", icone: "Foguete", valorAlvo: "100", dataAlvo: "2026-12-31" })).ok).toBe(false);
    expect(validarObjetivo(fd({ nome: "x", valorAlvo: "0", dataAlvo: "2026-12-31" })).ok).toBe(false);
    expect(validarObjetivo(fd({ nome: "x", valorAlvo: "100", dataAlvo: "31/12" })).ok).toBe(false);
  });

  it("guardar e resgatar", () => {
    expect(validarMovimento(fd({ tipo: "guardar", valor: "5000", data: "2026-09-23" }), 0)).toEqual({ ok: true, valor: 5000, data: "2026-09-23" });
    expect(validarMovimento(fd({ tipo: "resgatar", valor: "3000", data: "2026-09-23" }), 5000)).toEqual({ ok: true, valor: -3000, data: "2026-09-23" });
    expect(validarMovimento(fd({ tipo: "resgatar", valor: "6000", data: "2026-09-23" }), 5000).ok).toBe(false);
    expect(validarMovimento(fd({ tipo: "doar", valor: "100", data: "2026-09-23" }), 5000).ok).toBe(false);
  });
});

import { resumoPorPeriodo } from "./calculos";

describe("resumo do ano", () => {
  const l = (data: string, tipo: "gasto" | "entrada", valor: number, extra = {}) => ({
    data,
    tipo,
    valor,
    subtipoEntrada: tipo === "entrada" ? "salario" : null,
    status: "confirmado" as const,
    formaTipo: null,
    ...extra,
  });
  const ano = [
    l("2026-01-05", "entrada", 500000),
    l("2026-01-10", "gasto", 150000),
    l("2026-02-10", "gasto", 150000),
    l("2026-04-05", "entrada", 500000),
    l("2026-07-10", "gasto", 30000),
    l("2026-12-20", "gasto", 10000),
    l("2026-03-01", "entrada", 100000, { subtipoEntrada: "emprestimo" }), // fora
    l("2026-03-02", "gasto", 99999, { status: "estimado" }), // fora
    l("2025-12-31", "gasto", 70000), // outro ano, fora
  ];

  it("por mês: 12 meses com os rótulos certos", () => {
    const r = resumoPorPeriodo(ano, 2026, "mes");
    expect(r).toHaveLength(12);
    expect(r[0]).toMatchObject({ rotulo: "jan 2026", entradas: 500000, gasto: 150000, saldo: 350000 });
    expect(r[2]).toMatchObject({ entradas: 0, gasto: 0 }); // empréstimo e estimado não contam
  });

  it("por trimestre e semestre", () => {
    expect(resumoPorPeriodo(ano, 2026, "tri").map((p) => p.saldo)).toEqual([200000, 500000, -30000, -10000]);
    expect(resumoPorPeriodo(ano, 2026, "sem").map((p) => [p.rotulo, p.saldo])).toEqual([
      ["1º semestre", 700000],
      ["2º semestre", -40000],
    ]);
  });

  it("ano inteiro", () => {
    expect(resumoPorPeriodo(ano, 2026, "ano")).toEqual([
      { rotulo: "2026", entradas: 1000000, gasto: 340000, saldo: 660000, emAndamento: false },
    ]);
  });

  it("ano corrente para no mês atual e marca o período que contém ele", () => {
    const r = resumoPorPeriodo(ano, 2026, "tri", 9); // setembro ainda não acabou
    expect(r).toHaveLength(3);
    expect(r.map((p) => p.emAndamento)).toEqual([false, false, true]);
    expect(resumoPorPeriodo(ano, 2026, "mes", 9).at(-1)).toMatchObject({ rotulo: "set 2026", emAndamento: true });
    expect(resumoPorPeriodo(ano, 2026, "tri", 10).map((p) => p.emAndamento)).toEqual([false, false, false, true]);
    const s = resumoPorPeriodo(ano, 2026, "sem", 9);
    expect(s.map((p) => p.emAndamento)).toEqual([false, true]);
    expect(s[1].gasto).toBe(30000); // dezembro ainda não entrou
  });
});
