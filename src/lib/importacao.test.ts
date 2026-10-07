import { describe, expect, it } from "vitest";
import { lerImportacao, separarNovos } from "./importacao";

const arquivo = (lancamentos: unknown[]) => JSON.stringify({ app: "bolso", tipo: "importacao", lancamentos });
const linha = { data: "2026-05-07", descricao: "Salário", valor: 205393, tipo: "entrada", categoria: "Salário", forma: null };

describe("lerImportacao", () => {
  it("aceita um arquivo válido", () => {
    const r = lerImportacao(arquivo([linha, { ...linha, tipo: "gasto", descricao: "99", valor: 470, categoria: "Transporte", forma: "Pix" }]));
    expect(r.ok && r.linhas.length).toBe(2);
    expect(r.ok && r.linhas[1].forma).toBe("Pix");
  });
  it("recusa o que não é importação", () => {
    expect(lerImportacao("oi").ok).toBe(false);
    expect(lerImportacao(JSON.stringify({ app: "bolso", versao: 1, dados: {} })).ok).toBe(false);
    expect(lerImportacao(arquivo([])).ok).toBe(false);
  });
  it("aponta a linha com problema", () => {
    const r = lerImportacao(arquivo([linha, { ...linha, valor: 10.5 }]));
    expect(r).toEqual({ ok: false, erro: "Linha 2: valor inválido (centavos, maior que zero)." });
    expect(lerImportacao(arquivo([{ ...linha, data: "2026-02-30" }])).ok).toBe(false);
    expect(lerImportacao(arquivo([{ ...linha, tipo: "transferencia" }])).ok).toBe(false);
  });
});

describe("separarNovos", () => {
  it("pula o que já existe, mas mantém repetidos de verdade", () => {
    const cafe = { data: "2026-05-08", descricao: "Padaria", valor: 850, tipo: "gasto" as const, categoria: "Comida", forma: null, obs: null, conta: "Itaú" };
    const { novos, repetidos } = separarNovos([cafe, cafe, { ...cafe, valor: 900 }], [{ ...cafe, descricao: "padaria " }]);
    expect(repetidos).toBe(1);
    expect(novos.map((n) => n.valor)).toEqual([850, 900]);
  });
});
