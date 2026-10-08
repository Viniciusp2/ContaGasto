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

import { conciliar, type Existente } from "./importacao";

describe("conciliar com o que já está no app", () => {
  const linha = (o: Partial<Parameters<typeof conciliar>[0][number]>) => ({
    data: "2026-08-08", descricao: "Aluguel", valor: 100000, tipo: "gasto" as const, categoria: "Casa", forma: "Pix", obs: "Extrato Itaú: PIX TRANSF LUCIERL08/08", conta: "Itaú", ...o,
  });
  const seu = (o: Partial<Existente>): Existente => ({
    id: "a", data: "2026-08-06", vencimento: null, valor: 100000, tipo: "gasto", descricao: "Casa", descricaoGenerica: true, contaNome: null, status: "confirmado", ...o,
  });

  it("aluguel lançado à mão 2 dias antes: completa o seu, não duplica", () => {
    const r = conciliar([linha({})], [seu({})]);
    expect(r.novos).toEqual([]);
    expect(r.completar).toEqual([{ id: "a", linha: linha({}), pagar: false, trocarDescricao: true }]);
  });

  it("descrição escrita por você fica", () => {
    const r = conciliar([linha({})], [seu({ descricao: "Aluguel agosto", descricaoGenerica: false })]);
    expect(r.completar[0].trocarDescricao).toBe(false);
  });

  it("longe demais (mais de 4 dias) ou valor diferente: é outro lançamento", () => {
    expect(conciliar([linha({})], [seu({ data: "2026-08-01" })]).novos).toHaveLength(1);
    expect(conciliar([linha({})], [seu({ valor: 99000 })]).novos).toHaveLength(1);
  });

  it("lançamento de outro banco nunca é casado", () => {
    expect(conciliar([linha({})], [seu({ contaNome: "C6" })]).novos).toHaveLength(1);
  });

  it("mesmo banco com descrição editada: já existe, não mexe", () => {
    const r = conciliar([linha({})], [seu({ contaNome: "Itaú", descricao: "Aluguel do mês", descricaoGenerica: false, data: "2026-08-08" })]);
    expect(r).toEqual({ novos: [], repetidos: 1, completar: [] });
  });

  it("conta atrasada e a do mês pagas juntas: quita a mais antiga primeiro", () => {
    const vivo = (data: string) => linha({ data, descricao: "Vivo", valor: 5190, categoria: "Contas", obs: "Extrato Itaú: VIVO" });
    const r = conciliar(
      [vivo("2026-10-07"), vivo("2026-10-06")],
      [
        seu({ id: "out", status: "a_pagar", data: "2026-10-10", vencimento: "2026-10-10", valor: 5190, descricao: "Vivo", descricaoGenerica: false }),
        seu({ id: "set", status: "a_pagar", data: "2026-09-10", vencimento: "2026-09-10", valor: 5190, descricao: "Vivo", descricaoGenerica: false }),
      ],
    );
    expect(r.novos).toEqual([]);
    expect(r.completar.map((c) => [c.id, c.linha.data, c.pagar])).toEqual([
      ["set", "2026-10-06", true],
      ["out", "2026-10-07", true],
    ]);
  });

  it("dois iguais no extrato e só um seu: completa um e cria o outro", () => {
    const r = conciliar([linha({ valor: 550 }), linha({ valor: 550 })], [seu({ valor: 550, data: "2026-08-08" })]);
    expect(r.completar).toHaveLength(1);
    expect(r.novos).toHaveLength(1);
  });
});
