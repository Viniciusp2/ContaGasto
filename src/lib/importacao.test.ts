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

import { copiasAMais, type Importado } from "./importacao";

describe("copiasAMais (importação que duplicou)", () => {
  const linha = (o = {}) => ({ data: "2026-06-13", descricao: "Lavanderia", valor: 1790, tipo: "gasto" as const, categoria: "Casa", forma: "Débito", obs: "Extrato Itaú: PAY BRILH 13/06", conta: "Itaú", ...o });
  const imp = (id: string, minuto: number, o = {}): Importado => ({ id, data: "2026-06-13", valor: 1790, tipo: "gasto", descricao: "Lavanderia", contaNome: "Itaú", criadoEm: new Date(2026, 9, 7, 21, minuto), ...o });

  it("tudo em dobro: apaga uma de cada, a mais nova", () => {
    expect(copiasAMais([linha()], [imp("velho", 1), imp("novo", 2)])).toEqual(["novo"]);
  });

  it("dois iguais de verdade no arquivo ficam os dois", () => {
    expect(copiasAMais([linha(), linha()], [imp("a", 1), imp("b", 1)])).toEqual([]);
    expect(copiasAMais([linha(), linha()], [imp("a", 1), imp("b", 1), imp("c", 2), imp("d", 2)]).sort()).toEqual(["c", "d"]);
  });

  it("o que não está no arquivo (ou é de outro banco) não é tocado", () => {
    expect(copiasAMais([linha()], [imp("outro", 1, { descricao: "Café" }), imp("outro2", 2, { descricao: "Café" })])).toEqual([]);
    expect(copiasAMais([linha()], [imp("c6", 1, { contaNome: "C6" }), imp("c6b", 2, { contaNome: "C6" })])).toEqual([]);
  });
});

import { manuaisDuplicados, veioDeExtrato } from "./importacao";

describe("manuaisDuplicados", () => {
  const x = (id: string, data: string, valor: number, tipo = "gasto") => ({ id, data, valor, tipo, descricao: id });

  it("acha o seu que tem gêmeo no extrato (mesmo valor, até 4 dias)", () => {
    const pares = manuaisDuplicados([x("casa", "2026-08-06", 100000), x("cafe", "2026-08-06", 500)], [x("pix", "2026-08-08", 100000)]);
    expect(pares.map((p) => [p.manual.id, p.extrato.id])).toEqual([["casa", "pix"]]);
  });

  it("longe demais, outro valor ou outro tipo: não é gêmeo", () => {
    expect(manuaisDuplicados([x("m", "2026-08-01", 100000)], [x("e", "2026-08-08", 100000)])).toEqual([]);
    expect(manuaisDuplicados([x("m", "2026-08-08", 99000)], [x("e", "2026-08-08", 100000)])).toEqual([]);
    expect(manuaisDuplicados([x("m", "2026-08-08", 100000, "entrada")], [x("e", "2026-08-08", 100000)])).toEqual([]);
  });

  it("cada um do extrato leva só um seu, o mais perto", () => {
    const pares = manuaisDuplicados([x("longe", "2026-08-05", 470), x("perto", "2026-08-08", 470)], [x("e", "2026-08-08", 470)]);
    expect(pares.map((p) => p.manual.id)).toEqual(["perto"]);
  });

  it("reconhece o que veio de extrato pela observação", () => {
    expect(veioDeExtrato("Extrato Itaú: PIX TRANSF")).toBe(true);
    expect(veioDeExtrato("Aluguel pago por Pix pra Lucierlen. (Extrato Itaú: PIX TRANSF LUCIERL08/08)")).toBe(true);
    expect(veioDeExtrato("Conta de setembro, paga atrasada. Extrato Itaú: VIVO")).toBe(true);
    expect(veioDeExtrato("comprei no mercado")).toBe(false);
    expect(veioDeExtrato(null)).toBe(false);
  });
});
