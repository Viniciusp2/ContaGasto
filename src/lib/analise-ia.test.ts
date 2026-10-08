import { describe, expect, it } from "vitest";
import { dadosDaAnalise, lerAnalise, variacao } from "./analise-ia";
import { formatarCentavos } from "./dinheiro";

const l = (data: string, tipo: "gasto" | "entrada", valor: number, extra = {}) => ({
  data,
  tipo,
  valor,
  subtipoEntrada: tipo === "entrada" ? "salario" : null,
  status: "confirmado" as "confirmado" | "estimado" | "a_pagar",
  formaTipo: null as string | null,
  categoriaId: tipo === "entrada" ? "sal" : "mercado",
  descricao: null as string | null,
  recorrenciaId: null as string | null,
  ...extra,
});
const out = { ano: 2026, mes: 10 };
const nomes = new Map([
  ["mercado", "Mercado"],
  ["lazer", "Lazer"],
  ["moradia", "Moradia"],
  ["sal", "Salário"],
]);
const r = formatarCentavos;

describe("variação", () => {
  it("porcentagem com sinal, arredondada", () => {
    expect(variacao(14000, 10000)).toBe("+40%");
    expect(variacao(8800, 10000)).toBe("-12%");
    expect(variacao(10000, 10000)).toBe("0%");
  });
  it("sem mês passado não compara", () => {
    expect(variacao(5000, 0)).toBeNull();
  });
});

describe("dados da análise", () => {
  const atual = [
    l("2026-10-05", "entrada", 500000),
    l("2026-10-10", "gasto", 150000, { categoriaId: "moradia", descricao: "Aluguel", recorrenciaId: "r1" }),
    l("2026-10-03", "gasto", 2000, { descricao: "Padaria" }),
    l("2026-10-04", "gasto", 40000, { categoriaId: "lazer", descricao: "Show" }),
    l("2026-10-06", "gasto", 30000, { formaTipo: "beneficio" }), // VA, fora
    l("2026-10-07", "gasto", 12000, { status: "estimado" }), // estimado, fora
    l("2026-10-08", "gasto", 9000, { status: "a_pagar" }), // a pagar, fora do gasto
    l("2026-10-02", "entrada", 100000, { subtipoEntrada: "emprestimo" }), // fora
  ];
  const anterior = [
    l("2026-09-05", "entrada", 500000),
    l("2026-09-10", "gasto", 150000, { categoriaId: "moradia", recorrenciaId: "r1" }),
    l("2026-09-12", "gasto", 50000, { categoriaId: "lazer" }),
    l("2026-09-13", "gasto", 30000, { categoriaId: "outra" }),
  ];
  const d = dadosDaAnalise({
    mes: out,
    hoje: "2026-10-07",
    lancamentos: atual,
    anteriores: anterior,
    nomesCategorias: nomes,
    metas: [{ categoriaNome: "Lazer", limiteMensal: 20000, gasto: 40000, estado: "estourou" }],
  });

  it("totais com as mesmas regras do mês (sem VA, estimado, a pagar e empréstimo)", () => {
    expect(d.entradas).toBe(r(500000));
    expect(d.gastos).toBe(r(192000));
    expect(d.sobrou).toBe(r(308000));
    expect(d.sobrouNegativo).toBe(false);
  });

  it("mês em andamento avisa o dia", () => {
    expect(d.situacao).toContain("dia 7 de 31");
    const fechado = dadosDaAnalise({ mes: out, hoje: "2026-11-02", lancamentos: atual, anteriores: [], nomesCategorias: nomes, metas: [] });
    expect(fechado.situacao).toBe("mês fechado");
  });

  it("categorias em ordem, com o mês passado e a mudança já calculada", () => {
    expect(d.categorias.map((c) => c.nome)).toEqual(["Moradia", "Lazer", "Mercado"]);
    expect(d.categorias[1]).toMatchObject({ gasto: r(40000), mesPassado: r(50000), mudanca: "-20%", quantasVezes: 1 });
    expect(d.categorias[2].mudanca).toBeNull(); // não teve mercado em setembro
  });

  it("categoria que sumiu aparece à parte", () => {
    expect(d.sumiram).toEqual([{ nome: "Outros", mesPassado: r(30000) }]);
  });

  it("maiores gastos com descrição, e fixo marcado", () => {
    expect(d.maioresGastos[0]).toMatchObject({ descricao: "Aluguel", dia: 10, repete: true });
    expect(d.maioresGastos.map((g) => g.descricao)).toEqual(["Aluguel", "Show", "Padaria"]);
  });

  it("fixos x avulsos, compras pequenas e contas pendentes", () => {
    expect(d.fixosEParcelas).toBe(r(150000));
    expect(d.avulsos).toBe(r(42000));
    expect(d.comprasPequenas).toMatchObject({ quantas: 1, total: r(2000) });
    expect(d.contasAPagar).toEqual({ quantas: 1, total: r(9000) });
    expect(d.contasEstimadas).toBe(1);
  });

  it("metas viram texto", () => {
    expect(d.metas[0]).toEqual({ categoria: "Lazer", limite: r(20000), gasto: r(40000), estado: "estourou" });
  });

  it("sem mês passado não inventa comparação", () => {
    const sem = dadosDaAnalise({ mes: out, hoje: "2026-10-07", lancamentos: atual, anteriores: [], nomesCategorias: nomes, metas: [] });
    expect(sem.mesPassado).toBeNull();
    expect(sem.categorias[0].mesPassado).toBeNull();
    expect(sem.sumiram).toEqual([]);
  });
});

describe("ler a resposta da IA", () => {
  it("aceita o formato e tira travessão", () => {
    const a = lerAnalise(
      JSON.stringify({ resumo: "Mês tranquilo — sobrou bem.", pontos: [{ tipo: "bom", titulo: "Lazer caiu", texto: "Caiu 20%." }] }),
    );
    expect(a).toEqual({ resumo: "Mês tranquilo, sobrou bem.", pontos: [{ tipo: "bom", titulo: "Lazer caiu", texto: "Caiu 20%." }] });
  });
  it("descarta ponto fora do formato e limita a 5", () => {
    const pontos = Array.from({ length: 7 }, () => ({ tipo: "dica", titulo: "t", texto: "x" }));
    const a = lerAnalise(JSON.stringify({ resumo: "ok", pontos: [{ tipo: "outro", titulo: "t", texto: "x" }, ...pontos] }));
    expect(a?.pontos).toHaveLength(5);
  });
  it("JSON quebrado ou sem resumo vira null", () => {
    expect(lerAnalise("{quebrado")).toBeNull();
    expect(lerAnalise(JSON.stringify({ pontos: [] }))).toBeNull();
  });
});
