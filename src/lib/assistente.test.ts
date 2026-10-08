import { describe, expect, it } from "vitest";
import { formatarCentavos as fmt } from "./dinheiro";
import {
  contextoDaProposta,
  ferramentasAssistente,
  historicoParaApi,
  instrucoesAssistente,
  lerMesPedido,
  lerProposta,
  lerPropostaLembrete,
  limparResposta,
  MAX_HISTORICO,
  textoParcelas,
  type OpcoesLancamento,
} from "./assistente";

const opcoes: OpcoesLancamento = {
  categorias: [
    { id: "c-alim", nome: "Alimentação", tipo: "gasto" },
    { id: "c-outros-g", nome: "Outros", tipo: "gasto" },
    { id: "c-sal", nome: "Salário", tipo: "entrada" },
    { id: "c-outros-e", nome: "Outros", tipo: "entrada" },
  ],
  formas: [
    { id: "f-pix", nome: "Pix", tipo: "pix" },
    { id: "f-cred", nome: "Nubank crédito", tipo: "credito" },
  ],
  bancos: [{ id: "b-itau", nome: "Itaú" }],
};
const hoje = "2026-10-08";

describe("proposta de lançamento", () => {
  it("valor em reais vira centavos e acha categoria, forma e banco sem ligar pra acento", () => {
    const r = lerProposta(
      { tipo: "gasto", valor: 32.5, descricao: "iFood", categoria: "alimentacao", data: "2026-10-07", forma: "pix", banco: "itau", ja_paguei: true },
      opcoes,
      hoje,
    );
    expect(r).toEqual({
      ok: true,
      proposta: {
        tipo: "gasto",
        valor: 3250,
        descricao: "iFood",
        data: "2026-10-07",
        pago: true,
        categoriaId: "c-alim",
        categoriaNome: "Alimentação",
        formaPagamentoId: "f-pix",
        formaNome: "Pix",
        formaTipo: "pix",
        contaId: "b-itau",
        bancoNome: "Itaú",
        parcelas: null,
      },
    });
  });

  it("arredonda centavo quebrado e aceita vírgula", () => {
    const r = lerProposta({ tipo: "gasto", valor: "19,999", categoria: "Alimentação", ja_paguei: true }, opcoes, hoje);
    expect(r.ok && r.proposta.valor).toBe(2000);
  });

  it("categoria que não existe vira Outros do mesmo tipo", () => {
    const g = lerProposta({ tipo: "gasto", valor: 10, categoria: "Pets", ja_paguei: true }, opcoes, hoje);
    const e = lerProposta({ tipo: "entrada", valor: 10, categoria: "Alimentação", ja_paguei: true }, opcoes, hoje);
    expect(g.ok && g.proposta.categoriaId).toBe("c-outros-g");
    expect(e.ok && e.proposta.categoriaId).toBe("c-outros-e");
  });

  it("data errada vira hoje, descrição vazia vira o nome da categoria", () => {
    const r = lerProposta({ tipo: "gasto", valor: 10, categoria: "Alimentação", data: "ontem", descricao: " ", ja_paguei: true }, opcoes, hoje);
    expect(r.ok && r.proposta.data).toBe(hoje);
    expect(r.ok && r.proposta.descricao).toBe("Alimentação");
  });

  it("entrada nunca leva forma de pagamento e é sempre paga", () => {
    const r = lerProposta({ tipo: "entrada", valor: 4500, categoria: "Salário", forma: "Pix", ja_paguei: false }, opcoes, hoje);
    expect(r.ok && r.proposta.formaPagamentoId).toBeNull();
  });

  it("ainda vou pagar", () => {
    const r = lerProposta({ tipo: "gasto", valor: 100, categoria: "Outros", ja_paguei: false }, opcoes, hoje);
    expect(r.ok && r.proposta.pago).toBe(false);
  });

  it("parcelado: valor é o de cada parcela e a data é a da 1ª", () => {
    const r = lerProposta(
      { tipo: "gasto", valor: 51, descricao: "AliExpress", categoria: "Outros", data: "2026-10-20", forma: "Nubank crédito", parcelas: 3, ja_paguei: true },
      opcoes,
      hoje,
    );
    expect(r.ok && r.proposta).toMatchObject({ valor: 5100, parcelas: 3, data: "2026-10-20", formaTipo: "credito" });
  });

  it("parcelas 0 ou 1 é lançamento único; entrada não parcela; mais de 72 não", () => {
    const um = lerProposta({ tipo: "gasto", valor: 10, categoria: "Outros", parcelas: 1, ja_paguei: true }, opcoes, hoje);
    expect(um.ok && um.proposta.parcelas).toBeNull();
    expect(lerProposta({ tipo: "entrada", valor: 10, categoria: "Salário", parcelas: 3 }, opcoes, hoje)).toEqual({ ok: false, erro: "Entrada não pode ser parcelada." });
    expect(lerProposta({ tipo: "gasto", valor: 10, categoria: "Outros", parcelas: 100 }, opcoes, hoje).ok).toBe(false);
    expect(lerProposta({ tipo: "gasto", valor: 10, categoria: "Outros", parcelas: 2.5 }, opcoes, hoje).ok).toBe(false);
  });

  it("sem valor ou tipo errado não propõe", () => {
    expect(lerProposta({ tipo: "gasto", valor: 0, categoria: "Outros" }, opcoes, hoje).ok).toBe(false);
    expect(lerProposta({ tipo: "gasto", categoria: "Outros" }, opcoes, hoje).ok).toBe(false);
    expect(lerProposta({ tipo: "transferencia", valor: 10 }, opcoes, hoje).ok).toBe(false);
    expect(lerProposta({ tipo: "gasto", valor: 99_999_999 }, opcoes, hoje).ok).toBe(false);
  });
});

describe("histórico que vai pra API", () => {
  it("só as últimas mensagens e sempre começando por uma sua", () => {
    const muitas = Array.from({ length: 15 }, (_, i) => ({ papel: i % 2 ? ("bolso" as const) : ("voce" as const), texto: `m${i}` }));
    const h = historicoParaApi(muitas);
    expect(h.length).toBeLessThanOrEqual(MAX_HISTORICO);
    expect(h[0].papel).toBe("usuario");
    expect(h.at(-1)).toEqual({ papel: "usuario", texto: "m14" });
  });
  it("o que aconteceu com o cartão vai junto da mensagem", () => {
    const h = historicoParaApi([
      { papel: "voce", texto: "gastei 124,58 no aliexpress" },
      { papel: "bolso", texto: "Confere e salva:", contexto: "[Cartão: gasto AliExpress, R$ 124,58; a pessoa salvou]" },
      { papel: "voce", texto: "e divide em 3" },
    ]);
    expect(h[1]).toEqual({ papel: "assistente", texto: "Confere e salva:\n[Cartão: gasto AliExpress, R$ 124,58; a pessoa salvou]" });
  });

  it("ignora mensagem vazia", () => {
    expect(historicoParaApi([{ papel: "voce", texto: "  " }])).toEqual([]);
  });
});

describe("ferramentas e instruções", () => {
  it("as ferramentas, com as categorias como opção", () => {
    const f = ferramentasAssistente(opcoes);
    expect(f.map((t) => t.nome)).toEqual(["ver_mes", "buscar_lancamentos", "propor_lancamento", "ver_avisos", "propor_lembrete", "simular_parcelamento"]);
    const props = f[2].parametros.properties as Record<string, { enum?: string[] }>;
    expect(props.categoria.enum).toEqual(["Alimentação", "Outros", "Salário"]);
  });
  it("sem banco cadastrado o campo banco não aparece (enum vazio a API recusa)", () => {
    const props = ferramentasAssistente({ ...opcoes, bancos: [] })[2].parametros.properties as Record<string, unknown>;
    expect(props.banco).toBeUndefined();
    expect(props.forma).toBeDefined();
  });
  it("instruções trazem hoje, as categorias e as formas", () => {
    const t = instrucoesAssistente(hoje, opcoes);
    expect(t).toContain("Hoje é 2026-10-08");
    expect(t).toContain("Gasto: Alimentação, Outros");
    expect(t).toContain("Formas: Pix, Nubank crédito");
  });
  it("mês pedido fora do formato vira o mês de hoje", () => {
    expect(lerMesPedido("2026-09", hoje)).toBe("2026-09");
    expect(lerMesPedido("setembro", hoje)).toBe("2026-10");
    expect(lerMesPedido("2026-13", hoje)).toBe("2026-10");
  });
  it("resposta sem travessão", () => {
    expect(limparResposta("Mês bom — sobrou R$ 300. ")).toBe("Mês bom, sobrou R$ 300.");
  });
});

describe("proposta de lembrete", () => {
  it("aceita e repete só se pedirem", () => {
    expect(lerPropostaLembrete({ titulo: "Pagar o IPVA", data: "2026-10-15", repetir: "nao" }, hoje)).toEqual({
      ok: true,
      lembrete: { titulo: "Pagar o IPVA", data: "2026-10-15", repetir: "nao" },
    });
    expect(lerPropostaLembrete({ titulo: "Diarista", data: "2026-10-10" }, hoje)).toMatchObject({ ok: true, lembrete: { repetir: "nao" } });
  });
  it("recusa dia passado, sem título ou repetição estranha", () => {
    expect(lerPropostaLembrete({ titulo: "x", data: "2026-10-01", repetir: "nao" }, hoje).ok).toBe(false);
    expect(lerPropostaLembrete({ titulo: " ", data: "2026-10-15", repetir: "nao" }, hoje).ok).toBe(false);
    expect(lerPropostaLembrete({ titulo: "x", data: "2026-10-15", repetir: "diario" }, hoje).ok).toBe(false);
  });
});

describe("cartão proposto como texto", () => {
  const base = {
    tipo: "gasto" as const,
    valor: 5100,
    descricao: "AliExpress",
    data: "2026-10-20",
    pago: true,
    categoriaId: "c",
    categoriaNome: "Compras",
    formaPagamentoId: null,
    formaNome: null,
    formaTipo: null,
    contaId: null,
    bancoNome: null,
    parcelas: 3,
  };
  it("parcelas com total", () => {
    expect(textoParcelas(base)).toBe(`3x de ${fmt(5100)} (total ${fmt(15300)})`);
    expect(textoParcelas({ valor: 3250, parcelas: null })).toBe(fmt(3250));
  });
  it("contexto diz o que era e o que a pessoa fez", () => {
    expect(contextoDaProposta(base, "salvo")).toBe(`[Cartão: gasto AliExpress, 3x de ${fmt(5100)} (total ${fmt(15300)}), 1ª parcela ter, 20 out, categoria Compras; a pessoa salvou]`);
    expect(contextoDaProposta({ ...base, parcelas: null })).toContain("ainda não salvou");
    expect(contextoDaProposta({ ...base, parcelas: null }, "descartado")).toContain("a pessoa descartou");
  });
});
