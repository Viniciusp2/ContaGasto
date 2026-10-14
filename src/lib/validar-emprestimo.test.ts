import { describe, expect, it } from "vitest";
import { diasAtePrazo, textoDoPrazo, validarEmprestimo, validarQuitacao } from "./validar-emprestimo";

function form(campos: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

describe("validarEmprestimo", () => {
  const base = { direcao: "a_pagar", pessoa: " Irmão ", valor: "100000", data: "2026-09-10", descricao: "" };

  it("aceita e apara o nome", () => {
    expect(validarEmprestimo(form(base))).toEqual({
      ok: true,
      dados: { direcao: "a_pagar", pessoa: "Irmão", valor: 100000, data: "2026-09-10", prazo: null, descricao: "" },
    });
  });

  it.each([
    ["sem direção", { direcao: "" }],
    ["direção inválida", { direcao: "doacao" }],
    ["sem pessoa", { pessoa: "  " }],
    ["nome longo", { pessoa: "x".repeat(61) }],
    ["valor zero", { valor: "0" }],
    ["valor quebrado", { valor: "10.5" }],
    ["data inválida", { data: "2026-02-31" }],
    ["descrição longa", { descricao: "x".repeat(81) }],
    ["prazo inválido", { prazo: "2026-13-01" }],
    ["prazo antes do empréstimo", { prazo: "2026-09-01" }],
  ])("recusa: %s", (_n, campos) => {
    expect(validarEmprestimo(form({ ...base, ...campos })).ok).toBe(false);
  });
});

describe("validarQuitacao", () => {
  it("sem valor usa o do empréstimo", () => {
    expect(validarQuitacao(form({ data: "2026-09-20" }), "2026-09-10")).toEqual({ ok: true, data: "2026-09-20", valor: null });
  });

  it("com juros guarda quanto pagou", () => {
    expect(validarQuitacao(form({ data: "2026-09-20", valor: "110000" }), "2026-09-10")).toEqual({
      ok: true,
      data: "2026-09-20",
      valor: 110000,
    });
  });

  it("não quita antes de ter emprestado", () => {
    expect(validarQuitacao(form({ data: "2026-09-01" }), "2026-09-10").ok).toBe(false);
  });

  it("recusa valor zero e data inválida", () => {
    expect(validarQuitacao(form({ data: "2026-09-20", valor: "0" }), "2026-09-10").ok).toBe(false);
    expect(validarQuitacao(form({ data: "ontem" }), "2026-09-10").ok).toBe(false);
  });
});

describe("prazo pra devolver", () => {
  it("aceita prazo depois do empréstimo", () => {
    const f = new FormData();
    for (const [k, v] of Object.entries({ direcao: "a_pagar", pessoa: "Irmão", valor: "100", data: "2026-09-10", prazo: "2026-12-10" })) f.set(k, v);
    const r = validarEmprestimo(f);
    expect(r.ok && r.dados.prazo).toBe("2026-12-10");
  });

  it("conta os dias, virando mês e ano", () => {
    expect(diasAtePrazo("2026-09-30", "2026-09-23")).toBe(7);
    expect(diasAtePrazo("2027-01-02", "2026-12-30")).toBe(3);
    expect(diasAtePrazo("2026-09-20", "2026-09-23")).toBe(-3);
  });

  it("texto amigável", () => {
    expect(textoDoPrazo("2026-09-23", "2026-09-23")).toEqual({ texto: "vence hoje", atrasado: false });
    expect(textoDoPrazo("2026-09-24", "2026-09-23")).toEqual({ texto: "vence amanhã", atrasado: false });
    expect(textoDoPrazo("2026-10-03", "2026-09-23")).toEqual({ texto: "vence em 10 dias", atrasado: false });
    expect(textoDoPrazo("2026-09-22", "2026-09-23")).toEqual({ texto: "atrasado 1 dia", atrasado: true });
    expect(textoDoPrazo("2026-09-18", "2026-09-23")).toEqual({ texto: "atrasado 5 dias", atrasado: true });
  });
});
