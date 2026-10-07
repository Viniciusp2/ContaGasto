import { describe, expect, it } from "vitest";
import { resumoPagamentos, situacaoConta, statusAoGerar, textoVencimento, tipoContaValido } from "./contas";

describe("statusAoGerar", () => {
  const base = { variavel: false, tipo: "gasto" as const, formaTipo: "pix", automatico: false };
  it("gasto pago na mão nasce a pagar", () => {
    expect(statusAoGerar(base)).toBe("a_pagar");
    expect(statusAoGerar({ ...base, formaTipo: null })).toBe("a_pagar");
    expect(statusAoGerar({ ...base, formaTipo: "boleto" })).toBe("a_pagar");
  });
  it("valor que muda nasce estimado", () => {
    expect(statusAoGerar({ ...base, variavel: true })).toBe("estimado");
  });
  it("crédito, VA, débito automático e entrada nascem confirmados", () => {
    expect(statusAoGerar({ ...base, formaTipo: "credito" })).toBe("confirmado");
    expect(statusAoGerar({ ...base, formaTipo: "beneficio" })).toBe("confirmado");
    expect(statusAoGerar({ ...base, automatico: true })).toBe("confirmado");
    expect(statusAoGerar({ ...base, tipo: "entrada" })).toBe("confirmado");
  });
});

describe("situacaoConta e textoVencimento", () => {
  it("paga, atrasada, vence hoje e a pagar", () => {
    expect(situacaoConta(true, "2026-10-01", "2026-10-07")).toBe("paga");
    expect(situacaoConta(false, "2026-09-10", "2026-10-07")).toBe("atrasada");
    expect(situacaoConta(false, "2026-10-07", "2026-10-07")).toBe("vence_hoje");
    expect(situacaoConta(false, "2026-10-10", "2026-10-07")).toBe("a_pagar");
  });
  it("texto do vencimento", () => {
    expect(textoVencimento("2026-10-07", "2026-10-07")).toBe("vence hoje");
    expect(textoVencimento("2026-10-08", "2026-10-07")).toBe("vence amanhã");
    expect(textoVencimento("2026-10-12", "2026-10-07")).toBe("vence em 5 dias");
    expect(textoVencimento("2026-10-06", "2026-10-07")).toBe("atrasada 1 dia");
    expect(textoVencimento("2026-09-10", "2026-10-07")).toBe("atrasada 27 dias");
  });
});

describe("resumoPagamentos", () => {
  it("soma total, pago e o que falta (aluguel atrasado conta junto)", () => {
    const r = resumoPagamentos([
      { valor: 125000, paga: false }, // aluguel do mês passado
      { valor: 125000, paga: false },
      { valor: 10000, paga: true },
    ]);
    expect(r).toEqual({ total: 260000, pago: 10000, falta: 250000, quantas: 3, pagas: 1 });
  });
});

it("tipo de conta conhecido", () => {
  expect(tipoContaValido("luz")).toBe(true);
  expect(tipoContaValido("xyz")).toBe(false);
});

import { duracaoConta, mesCurto } from "./contas";

describe("duracaoConta", () => {
  it("parcelado diz a parcela e quando termina", () => {
    expect(duracaoConta({ temporaria: true, parcela: 4, totalParcelas: 10, ultimaData: "2027-03-10" })).toBe(
      "parcela 4/10, termina em mar/2027",
    );
    expect(duracaoConta({ temporaria: true, parcela: 10, totalParcelas: 10, ultimaData: "2027-03-10" })).toBe(
      "parcela 10/10, a última",
    );
  });
  it("fixo: todo mês ou até quando", () => {
    expect(duracaoConta({ temporaria: false, parcela: null, totalParcelas: null, ultimaData: null })).toBe("todo mês");
    expect(duracaoConta({ temporaria: false, parcela: null, totalParcelas: null, ultimaData: "2026-12-31" })).toBe(
      "até dez/2026",
    );
    expect(mesCurto("2026-01-05")).toBe("jan/2026");
  });
});
