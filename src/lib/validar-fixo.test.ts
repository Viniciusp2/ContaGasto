import { describe, expect, it } from "vitest";
import { lerModoApagar, validarEdicaoFixo } from "./validar-fixo";

const CAT = "11111111-1111-4111-8111-111111111111";
const form = (campos: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ descricao: "Aluguel", valor: "100000", categoriaId: CAT, diaDoMes: "6", ...campos })) fd.set(k, v);
  return fd;
};
const fixo = { tipo: "fixa" as const, parcelasGeradas: 0 };

describe("validarEdicaoFixo", () => {
  it("aceita a edição comum, aplicando nas abertas por padrão", () => {
    const r = validarEdicaoFixo(form({ contaId: "22222222-2222-4222-8222-222222222222", tipoConta: "aluguel" }), fixo);
    expect(r.ok && r.dados).toMatchObject({ descricao: "Aluguel", valor: 100000, diaDoMes: 6, diaUtil: null, tipoConta: "aluguel", aplicarNasAbertas: true });
  });
  it("dia útil e último dia útil", () => {
    expect(validarEdicaoFixo(form({ quando: "util", diaUtil: "5" }), fixo)).toMatchObject({ ok: true, dados: { diaUtil: 5 } });
    expect(validarEdicaoFixo(form({ quando: "ultimo_util", diaDoMes: "" }), fixo)).toMatchObject({ ok: true, dados: { diaUtil: -1, diaDoMes: 1 } });
    expect(validarEdicaoFixo(form({ quando: "util", diaUtil: "40" }), fixo).ok).toBe(false);
  });
  it("recusa valor, dia e descrição inválidos", () => {
    expect(validarEdicaoFixo(form({ valor: "0" }), fixo).ok).toBe(false);
    expect(validarEdicaoFixo(form({ diaDoMes: "32" }), fixo).ok).toBe(false);
    expect(validarEdicaoFixo(form({ descricao: " " }), fixo).ok).toBe(false);
  });
  it("parcelado: total não pode ser menor que as parcelas que já caíram", () => {
    const parc = { tipo: "temporaria" as const, parcelasGeradas: 4 };
    expect(validarEdicaoFixo(form({ totalParcelas: "10" }), parc)).toMatchObject({ ok: true, dados: { totalParcelas: 10 } });
    expect(validarEdicaoFixo(form({ totalParcelas: "3" }), parc)).toEqual({ ok: false, erro: "Já caíram 4 parcelas: o total não pode ser menor que isso." });
  });
  it("não aplicar nas abertas quando desmarcado", () => {
    expect(validarEdicaoFixo(form({ aplicarNasAbertas: "nao" }), fixo)).toMatchObject({ ok: true, dados: { aplicarNasAbertas: false } });
  });
});

it("modo de apagar", () => {
  expect(lerModoApagar("tudo")).toBe("tudo");
  expect(lerModoApagar("xyz")).toBeNull();
});
