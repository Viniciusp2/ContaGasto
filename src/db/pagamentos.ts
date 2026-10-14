// Pagamentos do mês (Sprint 6.1): junta as contas do mês, pagas ou não, as atrasadas e as faturas do cartão.
import { and, between, eq, gte, inArray, isNotNull, or, sql } from "drizzle-orm";
import { dadosTipoConta, duracaoConta, ehContaDoMes } from "@/lib/contas";
import { intervaloDoMes, mesParaTexto, type Mes } from "@/lib/datas";
import { mediaEstimada, ocorrencia, ocorrenciasNoIntervalo } from "@/lib/recorrencias";
import { db } from ".";
import { listarFormasPagamento, listarRecorrencias } from "./consultas";
import { valoresConfirmadosRecentes } from "./gerar-recorrencias";
import { categorias, formasPagamento, lancamentos, pagamentosFatura, recorrencias } from "./schema";
import { USUARIO_PADRAO } from "./usuario-padrao";

const userId = USUARIO_PADRAO.id;

export type ContaDoMes = {
  chave: string;
  origem: "lancamento" | "prevista" | "fatura";
  lancamentoId?: string;
  recorrenciaId?: string;
  competencia?: string;
  formaId?: string;
  descricao: string;
  icone: string;
  cor?: string;
  tipoRotulo?: string; // "Luz", "Aluguel"...
  duracao?: string; // "todo mês", "parcela 4/10, termina em mar/2027"
  valor: number;
  vencimento: string;
  paga: boolean;
  pagoEm?: string;
  automatico: boolean; // débito automático: já nasce paga
  contaId?: string | null; // banco de onde sai (do lançamento ou do fixo): o Paguei já vem com ele
  estimado: boolean; // valor ainda é a média (luz, água)
  tipoConta?: string | null; // luz, aluguel... (pra urgência; conta solta adivinha pela descrição)
  negociacao?: string | null; // "negociando" | "acordo" (1.10.3, só em lançamento)
  negociacaoObs?: string | null;
};

// "recorrência-competência" das ocorrências que já viraram lançamento (inclusive as pagas adiantado)
export async function ocorrenciasJaLancadas(desde: string) {
  const linhas = await db
    .select({ rec: lancamentos.recorrenciaId, comp: lancamentos.competencia })
    .from(lancamentos)
    .where(and(eq(lancamentos.userId, userId), isNotNull(lancamentos.recorrenciaId), gte(lancamentos.competencia, desde.slice(0, 7))));
  return new Set(linhas.map((l) => `${l.rec}-${l.comp}`));
}

type Rec = Awaited<ReturnType<typeof listarRecorrencias>>[number];

function cartaoDe(r: Rec) {
  return r.formaTipo === "credito" ? { diaFechamento: r.diaFechamento, diaVencimento: r.diaVencimento } : null;
}

// Até quando a recorrência vai: última parcela ou data de fim
function ultimaData(r: Rec) {
  if (r.rec.tipo === "temporaria" && r.rec.totalParcelas) return ocorrencia(r.rec, r.rec.totalParcelas - 1, cartaoDe(r)).data;
  return r.rec.dataFim;
}

function visualDaConta(r: Rec | undefined, categoriaIcone: string, categoriaCor: string) {
  const tipo = dadosTipoConta(r?.rec.tipoConta);
  return { icone: tipo?.icone ?? categoriaIcone, cor: categoriaCor, tipoRotulo: tipo?.rotulo };
}

export async function contasDoMes(mes: Mes, hoje: string): Promise<ContaDoMes[]> {
  const { inicio, fim } = intervaloDoMes(mes);
  const mesAtual = hoje >= inicio && hoje <= fim;
  const recs = await listarRecorrencias();
  const porId = new Map(recs.map((r) => [r.rec.id, r]));
  const contas: ContaDoMes[] = [];

  // 1. Lançamentos que são conta: gerados por fixo, "a pagar", ou conta solta já paga (luz, faculdade, assinatura,
  // boleto, aluguel: regra em ehContaDoMes). Crédito vai na fatura; VA fica de fora.
  // No mês atual entram também as não pagas de meses anteriores (o aluguel atrasado continua aqui até pagar),
  // e em qualquer mês as atrasadas que foram pagas nele (pagou dois aluguéis esse mês: os dois aparecem).
  const venc = sql`coalesce(${lancamentos.vencimento}, ${lancamentos.data})`;
  const linhas = await db
    .select({
      l: lancamentos,
      categoriaIcone: categorias.icone,
      categoriaCor: categorias.cor,
      categoriaNome: categorias.nome,
      formaTipo: formasPagamento.tipo,
    })
    .from(lancamentos)
    .innerJoin(categorias, eq(lancamentos.categoriaId, categorias.id))
    .leftJoin(formasPagamento, eq(lancamentos.formaPagamentoId, formasPagamento.id))
    .where(
      and(
        eq(lancamentos.userId, userId),
        eq(lancamentos.tipo, "gasto"),
        or(
          sql`${venc} between ${inicio} and ${fim}`,
          mesAtual ? and(sql`${venc} < ${inicio}`, inArray(lancamentos.status, ["a_pagar", "estimado"])) : sql`false`,
          and(sql`${venc} < ${inicio}`, eq(lancamentos.status, "confirmado"), between(lancamentos.data, inicio, fim)),
        ),
      ),
    );

  for (const { l, categoriaIcone, categoriaCor, categoriaNome, formaTipo } of linhas) {
    if (formaTipo === "credito" || formaTipo === "beneficio") continue;
    if (!ehContaDoMes({ ...l, categoriaNome, formaTipo })) continue;
    const r = l.recorrenciaId ? porId.get(l.recorrenciaId) : undefined;
    const paga = l.status === "confirmado";
    contas.push({
      chave: l.id,
      origem: "lancamento",
      contaId: l.contaId ?? r?.rec.contaId ?? null,
      lancamentoId: l.id,
      recorrenciaId: l.recorrenciaId ?? undefined,
      descricao: l.descricao,
      ...visualDaConta(r, categoriaIcone, categoriaCor),
      ...(r ? {} : { tipoRotulo: categoriaNome }),
      duracao: r
        ? duracaoConta({ temporaria: r.rec.tipo === "temporaria", parcela: l.parcela, totalParcelas: r.rec.totalParcelas, ultimaData: ultimaData(r) })
        : undefined,
      valor: l.valor,
      vencimento: l.vencimento ?? l.data,
      paga,
      pagoEm: paga ? l.data : undefined,
      automatico: Boolean(r?.rec.pagamentoAutomatico),
      estimado: l.status === "estimado",
      tipoConta: r?.rec.tipoConta ?? null,
      negociacao: l.negociacao,
      negociacaoObs: l.negociacaoObs,
    });
  }

  // 2. O que ainda vai vencer no mês e não virou lançamento (dá pra pagar adiantado)
  const jaLancadas = await ocorrenciasJaLancadas(inicio);
  const de = mesAtual ? hoje : `${mesParaTexto(mes)}-00`; // "-00" fica antes do dia 1: pega o mês inteiro
  const futurasNoCartao: { formaId: string; valor: number }[] = [];
  if (fim >= hoje) {
    for (const r of recs) {
      if (r.categoriaTipo !== "gasto" || r.formaTipo === "beneficio") continue;
      if (!r.rec.ativa && !r.rec.dataFim) continue; // pausado
      const variavel = r.rec.tipo === "fixa_variavel";
      for (const o of ocorrenciasNoIntervalo(r.rec, cartaoDe(r), de, fim)) {
        if (jaLancadas.has(`${r.rec.id}-${o.competencia}`)) continue;
        const valor = variavel
          ? mediaEstimada(await valoresConfirmadosRecentes(r.rec.id, r.rec.mesesMedia), r.rec.mesesMedia, r.rec.valorEstimado ?? r.rec.valor)
          : r.rec.valor;
        if (r.formaTipo === "credito") {
          futurasNoCartao.push({ formaId: r.rec.formaPagamentoId!, valor });
          continue;
        }
        contas.push({
          chave: `${r.rec.id}-${o.competencia}`,
          origem: "prevista",
          contaId: r.rec.contaId ?? null,
          recorrenciaId: r.rec.id,
          competencia: o.competencia,
          descricao: r.rec.descricao,
          ...visualDaConta(r, r.categoriaIcone, r.categoriaCor),
          duracao: duracaoConta({ temporaria: r.rec.tipo === "temporaria", parcela: o.parcela, totalParcelas: r.rec.totalParcelas, ultimaData: ultimaData(r) }),
          valor,
          vencimento: o.data,
          paga: false,
          automatico: r.rec.pagamentoAutomatico,
          estimado: variavel,
          tipoConta: r.rec.tipoConta,
        });
      }
    }
  }

  // 3. Fatura de cada cartão com vencimento no mês: soma dos gastos no crédito que caem nela
  const cartoes = (await listarFormasPagamento()).filter((f) => f.tipo === "credito");
  if (cartoes.length > 0) {
    const gastosCartao = await db
      .select({
        formaId: lancamentos.formaPagamentoId,
        total: sql<number>`sum(${lancamentos.valor})::int`,
        vencimento: sql<string>`max(${lancamentos.data})`,
      })
      .from(lancamentos)
      .where(
        and(
          eq(lancamentos.userId, userId),
          eq(lancamentos.tipo, "gasto"),
          inArray(lancamentos.formaPagamentoId, cartoes.map((c) => c.id)),
          between(lancamentos.data, inicio, fim),
        ),
      )
      .groupBy(lancamentos.formaPagamentoId);
    const pagas = await db
      .select()
      .from(pagamentosFatura)
      .where(and(eq(pagamentosFatura.userId, userId), eq(pagamentosFatura.competencia, mesParaTexto(mes))));

    for (const c of cartoes) {
      const g = gastosCartao.find((x) => x.formaId === c.id);
      const futuro = futurasNoCartao.filter((f) => f.formaId === c.id).reduce((s, f) => s + f.valor, 0);
      const total = (g?.total ?? 0) + futuro;
      if (total === 0) continue;
      const pagamento = pagas.find((p) => p.formaPagamentoId === c.id);
      const vencimento = c.diaVencimento
        ? `${mesParaTexto(mes)}-${String(Math.min(c.diaVencimento, Number(fim.slice(8)))).padStart(2, "0")}`
        : (g?.vencimento ?? fim);
      contas.push({
        chave: `fatura-${c.id}`,
        origem: "fatura",
        formaId: c.id,
        competencia: mesParaTexto(mes),
        descricao: `Fatura ${c.nome}`,
        icone: "CreditCard",
        tipoRotulo: "Cartão",
        tipoConta: "cartao",
        duracao: c.diaVencimento ? undefined : "configure o vencimento em Cartões",
        valor: total,
        vencimento,
        paga: Boolean(pagamento),
        pagoEm: pagamento?.pagoEm,
        automatico: false,
        estimado: false,
      });
    }
  }

  return contas.sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.descricao.localeCompare(b.descricao));
}

// Contas não pagas que já venceram ou vencem logo (pro aviso no Início e pras notificações)
export async function contasPendentes(hoje: string, ateDias = 3) {
  const [a, m] = hoje.split("-").map(Number);
  const contas = await contasDoMes({ ano: a, mes: m }, hoje);
  const limite = new Date(Date.UTC(a, m - 1, Number(hoje.slice(8)) + ateDias)).toISOString().slice(0, 10);
  return contas.filter((c) => !c.paga && !c.automatico && c.vencimento <= limite);
}

// Usado pela recorrência ao pagar adiantado
export async function buscarRecorrencia(id: string) {
  const [r] = await db.select().from(recorrencias).where(and(eq(recorrencias.id, id), eq(recorrencias.userId, userId)));
  return r ?? null;
}
