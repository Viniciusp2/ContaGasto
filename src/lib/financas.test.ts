import { describe, expect, it } from "vitest";
import { simularParcelamento, taxaAnual } from "./financas";

describe("simular parcelamento", () => {
  it("o caso do AliExpress: R$ 124,58 em 3x a 23% ao mês", () => {
    const r = simularParcelamento(12458, 23, 3);
    // Price: 124,58 x 0,23 / (1 - 1,23^-3) = 61,94
    expect(r.price).toEqual({ parcela: 6194, totalPago: 18582, juros: 6124 });
    // Uma vez: 124,58 x 1,23 / 3 = 51,08 (os "50 e pouco")
    expect(r.taxaUmaVez).toEqual({ parcela: 5108, totalPago: 15324, juros: 2866 });
  });

  it("sem juros divide o total, arredondando a parcela pra cima", () => {
    expect(simularParcelamento(10000, 0, 3).price).toEqual({ parcela: 3334, totalPago: 10002, juros: 2 });
    expect(simularParcelamento(30000, 0, 3).price).toEqual({ parcela: 10000, totalPago: 30000, juros: 0 });
  });

  it("taxa ao ano com juros compostos", () => {
    expect(Math.round(taxaAnual(1))).toBe(13);
    expect(Math.round(taxaAnual(23))).toBe(1099); // 1,23^12 = 11,99
  });
});
