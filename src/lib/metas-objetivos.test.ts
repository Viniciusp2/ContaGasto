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
