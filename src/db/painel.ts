// Painel do Início (Sprint 3.3): junta o que vai cair, o que foi guardado e as assinaturas.
import { and, between, eq, lte, sql } from "drizzle-orm";
import { intervaloDoMes, somarMeses, type Mes } from "@/lib/datas";
import { mediaEstimada, ocorrenciasNoIntervalo } from "@/lib/recorrencias";
import { db } from ".";
import { listarRecorrencias } from "./consultas";
import { valoresConfirmadosRecentes } from "./gerar-recorrencias";
import { categorias, emprestimos, lancamentos, movimentosObjetivo } from "./schema";
import { USUARIO_PADRAO } from "./usuario-padrao";

const userId = USUARIO_PADRAO.id;

export type Compromisso = {
  chave: string;
  descricao: string;
  valor: number;
  data: string;
  tipo: "fixo" | "parcela" | "estimado" | "a_confirmar" | "emprestimo" | "entrada";
  detalhe?: string;
  icone?: string;
  cor?: string;
  href?: string;
};

// Recorrências que ainda vão cair no intervalo (de, ate]. Por padrão só gastos; VA sempre fica de fora.
async function recorrenciasNoIntervalo(de: string, ate: string, tipo: "gasto" | "entrada" = "gasto"): Promise<Compromisso[]> {
  const itens: Compromisso[] = [];
  for (const r of await listarRecorrencias()) {
    if (r.categoriaTipo !== tipo || r.formaTipo === "beneficio" || r.categoriaNome === "Vale alimentação") continue;
    const cartao = r.formaTipo === "credito" ? { diaFechamento: r.diaFechamento, diaVencimento: r.diaVencimento } : null;
    const ocorrencias = ocorrenciasNoIntervalo(r.rec, cartao, de, ate);
    if (ocorrencias.length === 0) continue;

    const variavel = r.rec.tipo === "fixa_variavel";
    const valor = variavel
      ? mediaEstimada(await valoresConfirmadosRecentes(r.rec.id, r.rec.mesesMedia), r.rec.mesesMedia, r.rec.valorEstimado ?? r.rec.valor)
      : r.rec.valor;

    for (const o of ocorrencias) {
      itens.push({
        chave: `${r.rec.id}-${o.competencia}`,
        descricao: r.rec.descricao,
        valor,
        data: o.data,
        tipo: tipo === "entrada" ? "entrada" : variavel ? "estimado" : o.parcela ? "parcela" : "fixo",
        detalhe: o.parcela ? `parcela ${o.parcela}/${r.rec.totalParcelas}` : variavel ? "estimado" : undefined,
        icone: r.categoriaIcone,
        cor: r.categoriaCor,
        href: "/fixos",
      });
    }
  }
  return itens;
}

// Compromissos do mês atual (4.9): o que ainda vai cair até o fim do mês, as contas estimadas
// esperando confirmação e o que você deve com prazo até o fim do mês (inclusive atrasado)
export async function compromissosDoMes(hoje: string, mes: Mes): Promise<Compromisso[]> {
  const { inicio, fim } = intervaloDoMes(mes);

  const futuros = await recorrenciasNoIntervalo(hoje, fim);

  const aConfirmar = await db
    .select({
      id: lancamentos.id,
      descricao: lancamentos.descricao,
      valor: lancamentos.valor,
      data: lancamentos.data,
      icone: categorias.icone,
      cor: categorias.cor,
    })
    .from(lancamentos)
    .innerJoin(categorias, eq(lancamentos.categoriaId, categorias.id))
    .where(
      and(
        eq(lancamentos.userId, userId),
        eq(lancamentos.tipo, "gasto"),
        eq(lancamentos.status, "estimado"),
        between(lancamentos.data, inicio, fim),
      ),
    );

  const dividas = await db
    .select()
    .from(emprestimos)
    .where(
      and(
        eq(emprestimos.userId, userId),
        eq(emprestimos.direcao, "a_pagar"),
        eq(emprestimos.quitado, false),
        lte(emprestimos.prazo, fim),
      ),
    );

  return [
    ...aConfirmar.map((l) => ({
      chave: l.id,
      descricao: l.descricao,
      valor: l.valor,
      data: l.data,
      tipo: "a_confirmar" as const,
      detalhe: "confirme o valor",
      icone: l.icone,
      cor: l.cor,
      href: `/lancamentos/${l.id}/editar`,
    })),
    ...futuros,
    ...dividas.map((e) => ({
      chave: e.id,
      descricao: `Devolver pra ${e.pessoa}`,
      valor: e.valor,
      data: e.prazo!,
      tipo: "emprestimo" as const,
      detalhe: e.prazo! < hoje ? "atrasado" : "empréstimo",
      icone: "HandCoins",
      href: "/emprestimos",
    })),
  ].sort((a, b) => a.data.localeCompare(b.data));
}

// Comprometido no próximo mês: fixos, parcelas e contas estimadas que vão cair nele
export async function comprometidoProximoMes(mes: Mes) {
  const proximo = intervaloDoMes(somarMeses(mes, 1));
  const { fim } = intervaloDoMes(mes);
  const itens = await recorrenciasNoIntervalo(fim, proximo.fim);
  return { total: itens.reduce((s, i) => s + i.valor, 0), itens };
}

// Assinaturas ativas: fixos na categoria Assinaturas que ainda vão continuar
export async function assinaturasAtivas(hoje: string) {
  const lista = (await listarRecorrencias()).filter(
    (r) => r.categoriaNome === "Assinaturas" && r.rec.tipo !== "temporaria" && (!r.rec.dataFim || r.rec.dataFim >= hoje),
  );
  return { total: lista.reduce((s, r) => s + r.rec.valor, 0), itens: lista };
}

// Quanto foi guardado (menos resgatado) nos objetivos durante o mês
export async function guardadoNoMes(mes: Mes) {
  const { inicio, fim } = intervaloDoMes(mes);
  const [linha] = await db
    .select({ total: sql<number>`coalesce(sum(${movimentosObjetivo.valor}), 0)::int` })
    .from(movimentosObjetivo)
    .where(and(eq(movimentosObjetivo.userId, userId), between(movimentosObjetivo.data, inicio, fim)));
  return linha?.total ?? 0;
}

// Entradas recorrentes que ainda vão cair até o fim do mês (salário no 5º dia útil etc). Só pra linha do tempo:
// o disponível não conta com elas.
export async function entradasPrevistasDoMes(hoje: string, mes: Mes) {
  return recorrenciasNoIntervalo(hoje, intervaloDoMes(mes).fim, "entrada");
}
