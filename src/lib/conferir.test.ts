import { describe, expect, it } from "vitest";
import { atrasadasSemPagamento, chavePar, contasQueParecemPagas, diferencaDoBanco, possiveisRepetidos, semBanco, type LancConferir } from "./conferir";

const l = (id: string, o: Partial<LancConferir>): LancConferir => ({
  id, data: "2026-10-01", vencimento: null, valor: 1000, tipo: "gasto", status: "confirmado", descricao: id, obs: null, contaId: null, recorrenciaId: null, ...o,
});

describe("contas a pagar que parecem pagas", () => {
  it("acha o pagamento com o mesmo valor perto do vencimento; a mais antiga primeiro", () => {
    const pares = contasQueParecemPagas([
      l("casa-out", { status: "a_pagar", vencimento: "2026-10-06", data: "2026-10-06", valor: 100000 }),
      l("casa-set", { status: "a_pagar", vencimento: "2026-09-06", data: "2026-09-06", valor: 100000 }),
      l("pix", { data: "2026-09-08", valor: 100000, contaId: "itau" }),
    ]);
    expect(pares.map((p) => [p.pendente.id, p.pagamento.id])).toEqual([["casa-set", "pix"]]);
  });

  it("sem pagamento parecido: aparece como atrasada sem pagamento (caso do aluguel de set e out)", () => {
    const lancs = [
      l("casa-set", { status: "a_pagar", vencimento: "2026-09-06", data: "2026-09-06", valor: 100000 }),
      l("casa-out", { status: "a_pagar", vencimento: "2026-10-06", data: "2026-10-06", valor: 100000 }),
      l("aluguel-ago", { data: "2026-08-08", valor: 100000, contaId: "itau" }), // 29 dias antes: não é desse
    ];
    expect(contasQueParecemPagas(lancs)).toEqual([]);
    expect(atrasadasSemPagamento(lancs, "2026-10-07").map((x) => x.id)).toEqual(["casa-set", "casa-out"]);
  });
});

describe("possíveis repetidos", () => {
  it("mesmo valor e tipo com até 1 dia: aparece", () => {
    const r = possiveisRepetidos([l("manual", { data: "2026-10-07", valor: 18963 }), l("extrato", { data: "2026-10-07", valor: 18963, obs: "Extrato Itaú: PAG BOLETO", contaId: "itau" })], new Set());
    expect(r).toHaveLength(1);
    expect([r[0].a.id, r[0].b.id].sort()).toEqual(["extrato", "manual"]);
  });

  it("dois do extrato não aparecem, nem do mesmo banco nem de bancos diferentes (cada banco registrou o seu)", () => {
    expect(
      possiveisRepetidos([
        l("c6", { data: "2026-04-11", valor: 20000, tipo: "entrada", obs: "Extrato C6: Pix recebido de LUCIERLEN", contaId: "c6" }),
        l("itau", { data: "2026-04-11", valor: 20000, tipo: "entrada", obs: "Extrato Itaú: PIX TRANSF CARLOS", contaId: "itau" }),
      ], new Set()),
    ).toEqual([]);
    const r = possiveisRepetidos([
      l("u1", { data: "2026-10-07", valor: 9756, obs: "Extrato Itaú: PIX QRS UNIVERSIDAD", contaId: "itau" }),
      l("u2", { data: "2026-10-07", valor: 9756, obs: "Extrato Itaú: PIX QRS UNIVERSIDAD", contaId: "itau" }),
    ], new Set());
    expect(r).toEqual([]);
  });

  it("2 dias de diferença, outro valor ou já marcado como certo: não aparece", () => {
    expect(possiveisRepetidos([l("a", { data: "2026-10-01" }), l("b", { data: "2026-10-03" })], new Set())).toEqual([]);
    expect(possiveisRepetidos([l("a", {}), l("b", { valor: 999 })], new Set())).toEqual([]);
    expect(possiveisRepetidos([l("a", {}), l("b", {})], new Set([chavePar("b", "a")]))).toEqual([]);
  });
});

it("sem banco depois do primeiro saldo informado", () => {
  const r = semBanco([l("antes", { data: "2026-10-05" }), l("depois", { data: "2026-10-08" }), l("com-banco", { data: "2026-10-08", contaId: "c6" }), l("futuro", { data: "2026-10-20" })], "2026-10-07", "2026-10-10");
  expect(r.map((x) => x.id)).toEqual(["depois"]);
  expect(semBanco([l("x", {})], null, "2026-10-10")).toEqual([]);
});

it("diferença do banco", () => {
  expect(diferencaDoBanco(115900, 116500)).toBe(600);
});
