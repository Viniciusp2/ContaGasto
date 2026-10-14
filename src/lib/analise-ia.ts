// Análise do mês com IA (Sprint 6.7). Aqui só se monta o que a IA vai ler: todo número já vem
// calculado e escrito em reais, pra ela nunca precisar fazer conta (regra: o código calcula, a IA comenta).
import { contaComoEntrada, contaComoGasto, gastoPorCategoria, type EstadoMeta, type LancamentoCalculo } from "./calculos";
import { LIMITE_PEQUENO } from "./analise-ano";
import { diasNoMes, nomeDoMes, type Mes } from "./datas";
import { formatarCentavos } from "./dinheiro";
import { porDiaDaSemana } from "./graficos";

export type LancAnalise = LancamentoCalculo & {
  data: string;
  categoriaId: string;
  descricao: string | null;
  recorrenciaId: string | null;
};

export type MetaAnalise = { categoriaNome: string; limiteMensal: number; gasto: number; estado: EstadoMeta };

const reais = (centavos: number) => formatarCentavos(centavos);

// "+40%", "-12%" ou null quando não dá pra comparar (mês passado zerado)
export function variacao(atual: number, anterior: number): string | null {
  if (anterior <= 0) return null;
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

function somaGastos(lista: LancAnalise[]) {
  return lista.filter(contaComoGasto).reduce((s, l) => s + l.valor, 0);
}

function somaEntradas(lista: LancAnalise[]) {
  return lista.filter(contaComoEntrada).reduce((s, l) => s + l.valor, 0);
}

export function dadosDaAnalise({
  mes,
  hoje,
  lancamentos,
  anteriores,
  nomesCategorias,
  metas,
}: {
  mes: Mes;
  hoje: string;
  lancamentos: LancAnalise[];
  anteriores: LancAnalise[];
  nomesCategorias: Map<string, string>;
  metas: MetaAnalise[];
}) {
  const texto = `${mes.ano}-${String(mes.mes).padStart(2, "0")}`;
  const emAndamento = hoje.slice(0, 7) === texto;
  const gastos = lancamentos.filter(contaComoGasto);
  const gasto = somaGastos(lancamentos);
  const entradas = somaEntradas(lancamentos);
  const temAnterior = anteriores.some((l) => contaComoGasto(l) || contaComoEntrada(l));

  // Categorias do mês, da que mais gastou pra menor, com o mês passado do lado
  const atualPorCat = gastoPorCategoria(lancamentos);
  const antesPorCat = gastoPorCategoria(anteriores);
  const categorias = [...atualPorCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, valor]) => {
      const antes = antesPorCat.get(id) ?? 0;
      return {
        nome: nomesCategorias.get(id) ?? "Outros",
        gasto: reais(valor),
        parteDoTotal: `${gasto > 0 ? Math.round((valor / gasto) * 100) : 0}%`,
        quantasVezes: gastos.filter((l) => l.categoriaId === id).length,
        mesPassado: temAnterior ? reais(antes) : null,
        mudanca: temAnterior ? variacao(valor, antes) : null,
      };
    });

  // Categorias que sumiram neste mês (gastou no passado, nada agora)
  const sumiram = temAnterior
    ? [...antesPorCat.entries()]
        .filter(([id, v]) => v > 0 && !atualPorCat.has(id))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, v]) => ({ nome: nomesCategorias.get(id) ?? "Outros", mesPassado: reais(v) }))
    : [];

  const maioresGastos = [...gastos]
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8)
    .map((l) => ({
      dia: Number(l.data.slice(8, 10)),
      descricao: l.descricao?.trim() || (nomesCategorias.get(l.categoriaId) ?? "Sem descrição"),
      categoria: nomesCategorias.get(l.categoriaId) ?? "Outros",
      valor: reais(l.valor),
      repete: l.recorrenciaId !== null,
    }));

  const fixos = gastos.filter((l) => l.recorrenciaId !== null).reduce((s, l) => s + l.valor, 0);
  const pequenas = gastos.filter((l) => l.valor <= LIMITE_PEQUENO);
  const semana = porDiaDaSemana(lancamentos).filter((d) => d.valor > 0);
  const diaMaisCaro = [...semana].sort((a, b) => b.valor - a.valor)[0];
  const aPagar = lancamentos.filter((l) => l.tipo === "gasto" && l.status === "a_pagar");
  const estimados = lancamentos.filter((l) => l.tipo === "gasto" && l.status === "estimado");

  return {
    mes: nomeDoMes(mes),
    situacao: emAndamento
      ? `mês em andamento: hoje é dia ${Number(hoje.slice(8, 10))} de ${diasNoMes(mes)}, os números ainda vão mudar`
      : "mês fechado",
    entradas: reais(entradas),
    gastos: reais(gasto),
    sobrou: reais(entradas - gasto),
    sobrouNegativo: entradas - gasto < 0,
    mesPassado: temAnterior
      ? {
          entradas: reais(somaEntradas(anteriores)),
          gastos: reais(somaGastos(anteriores)),
          sobrou: reais(somaEntradas(anteriores) - somaGastos(anteriores)),
          mudancaNosGastos: variacao(gasto, somaGastos(anteriores)),
        }
      : null,
    fixosEParcelas: reais(fixos),
    avulsos: reais(gasto - fixos),
    categorias,
    sumiram,
    maioresGastos,
    comprasPequenas: { ate: reais(LIMITE_PEQUENO), quantas: pequenas.length, total: reais(pequenas.reduce((s, l) => s + l.valor, 0)) },
    diaDaSemanaQueMaisGasta: diaMaisCaro ? { dia: diaMaisCaro.dia, total: reais(diaMaisCaro.valor) } : null,
    metas: metas.map((m) => ({
      categoria: m.categoriaNome,
      limite: reais(m.limiteMensal),
      gasto: reais(m.gasto),
      estado: m.estado === "ok" ? "tranquila" : m.estado === "atencao" ? "perto do limite" : "estourou",
    })),
    contasAPagar: aPagar.length > 0 ? { quantas: aPagar.length, total: reais(aPagar.reduce((s, l) => s + l.valor, 0)) } : null,
    contasEstimadas: estimados.length,
  };
}

export type DadosAnalise = ReturnType<typeof dadosDaAnalise>;

// O que a IA devolve (structured output): um resumo curto e de 3 a 5 pontos
export type Analise = {
  resumo: string;
  pontos: { tipo: "bom" | "atencao" | "dica"; titulo: string; texto: string }[];
};

export const FORMATO_ANALISE = {
  type: "object",
  properties: {
    resumo: { type: "string", description: "Uma ou duas frases sobre como foi o mês." },
    pontos: {
      type: "array",
      description: "De 3 a 5 observações, da mais importante pra menos.",
      items: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["bom", "atencao", "dica"] },
          titulo: { type: "string", description: "Título curto, até 6 palavras." },
          texto: { type: "string", description: "Até 2 frases." },
        },
        required: ["tipo", "titulo", "texto"],
        additionalProperties: false,
      },
    },
  },
  required: ["resumo", "pontos"],
  additionalProperties: false,
} as const;

export const INSTRUCOES_ANALISE = `Você é o analista de gastos do Bolso, um app pessoal de controle de gastos. Quem lê é o dono do app, no celular.

Você recebe os números de um mês já calculados pelo app, em JSON. Escreva uma análise curta que ajude a pessoa a entender o mês e gastar melhor.

Regras:
- Use só os números que estão no JSON, do jeito que estão escritos. Não some, não subtraia, não calcule porcentagem nem crie número novo: se um número não está lá, fale sem ele.
- Português do Brasil, informal e direto, como um amigo que entende de dinheiro. Sem julgar e sem sermão.
- Não use travessão (—) nem emoji. Use vírgula ou dois pontos.
- Seja concreto: cite a categoria, o gasto ou o dia. Dica boa é uma ação que dá pra fazer no próximo mês.
- Se o mês está em andamento, deixe claro que é parcial e não tire conclusão forte de poucos dias.
- Como o app conta: gastos e entradas só contam o que já foi pago ou recebido. Conta a pagar e conta com valor estimado ainda não entram. Empréstimo não é renda. O que foi pago com vale alimentação fica fora dos gastos.
- "repete": true num gasto quer dizer que é fixo ou parcela.
- Não dê conselho de investimento nem de imposto.

Tipos de ponto: "bom" (algo que melhorou ou está saudável), "atencao" (algo que pesa ou estourou), "dica" (sugestão prática).`;

// Confere o JSON devolvido antes de mostrar (a IA pode, raramente, devolver algo fora do formato)
export function lerAnalise(texto: string): Analise | null {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return null;
  }
  if (typeof bruto !== "object" || bruto === null) return null;
  const { resumo, pontos } = bruto as Record<string, unknown>;
  if (typeof resumo !== "string" || !Array.isArray(pontos)) return null;
  const validos = pontos.filter(
    (p): p is Analise["pontos"][number] =>
      typeof p === "object" &&
      p !== null &&
      ["bom", "atencao", "dica"].includes((p as Record<string, unknown>).tipo as string) &&
      typeof (p as Record<string, unknown>).titulo === "string" &&
      typeof (p as Record<string, unknown>).texto === "string",
  );
  // Travessão escapado na resposta vira vírgula (regra da interface)
  const limpar = (s: string) => s.replace(/\s*—\s*/g, ", ").trim();
  return {
    resumo: limpar(resumo),
    pontos: validos.slice(0, 5).map((p) => ({ tipo: p.tipo, titulo: limpar(p.titulo), texto: limpar(p.texto) })),
  };
}
