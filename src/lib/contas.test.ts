import { describe, expect, it } from "vitest";
import { resumoPagamentos, situacaoConta, statusAoGerar, textoVencimento, tipoContaValido, ordenarPorUrgencia, tipoDaConta, urgenciaConta } from "./contas";

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

import { ehContaDoMes } from "./contas";

describe("o que entra em Pagamentos", () => {
  const base = { recorrenciaId: null, status: "confirmado", categoriaNome: "Comida", formaTipo: "debito", descricao: "Dalvi" };
  it("fixo e a pagar sempre entram", () => {
    expect(ehContaDoMes({ ...base, recorrenciaId: "r1" })).toBe(true);
    expect(ehContaDoMes({ ...base, status: "a_pagar" })).toBe(true);
  });
  it("conta solta (luz, faculdade, assinatura, boleto, aluguel) entra como paga", () => {
    expect(ehContaDoMes({ ...base, categoriaNome: "Contas", descricao: "Vivo" })).toBe(true);
    expect(ehContaDoMes({ ...base, categoriaNome: "Educação", descricao: "Universidade" })).toBe(true);
    expect(ehContaDoMes({ ...base, categoriaNome: "Assinaturas", descricao: "Netflix" })).toBe(true);
    expect(ehContaDoMes({ ...base, formaTipo: "boleto" })).toBe(true);
    expect(ehContaDoMes({ ...base, categoriaNome: "Casa", descricao: "Aluguel" })).toBe(true);
  });
  it("compra do dia a dia fica fora", () => {
    expect(ehContaDoMes(base)).toBe(false);
    expect(ehContaDoMes({ ...base, categoriaNome: "Casa", descricao: "Lavanderia" })).toBe(false);
  });
});

describe("urgência das contas (1.10.3)", () => {
  const hoje = "2026-10-08";
  const conta = (descricao: string, vencimento: string, extra = {}) => ({ descricao, vencimento, paga: false, automatico: false, ...extra });

  it("nível pelo prazo: atrasada, hoje e amanhã são urgentes; até 7 dias é logo; depois, com calma", () => {
    expect(urgenciaConta(conta("Luz", "2026-10-01", { tipoConta: "luz" }), hoje)?.nivel).toBe("urgente");
    expect(urgenciaConta(conta("Luz", "2026-10-09", { tipoConta: "luz" }), hoje)?.nivel).toBe("urgente");
    expect(urgenciaConta(conta("Luz", "2026-10-15", { tipoConta: "luz" }), hoje)?.nivel).toBe("logo");
    expect(urgenciaConta(conta("Luz", "2026-10-16", { tipoConta: "luz" }), hoje)?.nivel).toBe("calma");
  });

  it("motivo junta o prazo e o risco (no com calma, só o prazo)", () => {
    expect(urgenciaConta(conta("Luz", "2026-10-05", { tipoConta: "luz" }), hoje)?.motivo).toBe("atrasada 3 dias, risco de corte");
    expect(urgenciaConta(conta("Luz", "2026-10-30", { tipoConta: "luz" }), hoje)?.motivo).toBe("vence em 22 dias");
  });

  it("paga ou débito automático não tem urgência", () => {
    expect(urgenciaConta(conta("Luz", "2026-10-01", { paga: true }), hoje)).toBeNull();
    expect(urgenciaConta(conta("Luz", "2026-10-01", { automatico: true }), hoje)).toBeNull();
  });

  it("negociando sai do topo; acordo vale pela data nova", () => {
    expect(urgenciaConta(conta("Aluguel", "2026-09-10", { negociacao: "negociando" }), hoje)?.nivel).toBe("negociando");
    const acordo = urgenciaConta(conta("Aluguel", "2026-10-20", { negociacao: "acordo", tipoConta: "aluguel" }), hoje);
    expect(acordo).toMatchObject({ nivel: "calma", motivo: "acordo: vence em 12 dias" });
  });

  it("conta sem tipo: adivinha pela descrição", () => {
    expect(tipoDaConta(null, "Conta de energia Enel")).toBe("luz");
    expect(tipoDaConta(null, "Fatura Nubank")).toBe("cartao");
    expect(tipoDaConta(null, "Vivo Fibra")).toBe("internet");
    expect(tipoDaConta(null, "Netflix")).toBe("assinatura");
    expect(tipoDaConta(null, "Boi gordo")).toBe("outra");
    expect(tipoDaConta("agua", "qualquer")).toBe("agua");
  });

  it("ordem: urgente primeiro, depois o que pesa mais, depois quem vence antes", () => {
    const lista = [
      conta("Netflix", "2026-10-07", { tipoConta: "assinatura" }),
      conta("Internet", "2026-10-12", { tipoConta: "internet" }),
      conta("Aluguel", "2026-10-08", { tipoConta: "aluguel" }),
      conta("Cartão", "2026-10-09", { tipoConta: "cartao" }),
      conta("Escola", "2026-09-20", { tipoConta: "escola", negociacao: "negociando" }),
    ].map((c) => ({ ...c, urgencia: urgenciaConta(c, hoje)! }));
    expect(ordenarPorUrgencia(lista).map((c) => c.descricao)).toEqual(["Cartão", "Aluguel", "Netflix", "Internet", "Escola"]);
  });
});
