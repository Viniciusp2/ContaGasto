// Transforma recorrências em lançamentos quando a data chega (CLAUDE.md 4.3).
// Pode rodar quantas vezes quiser: gerada_ate + índice único impedem duplicar.
import { and, desc, eq } from "drizzle-orm";
import { hojeISO } from "@/lib/datas";
import { subtipoDaCategoria } from "@/lib/entradas";
import { mediaEstimada, ocorrenciasPendentes } from "@/lib/recorrencias";
import { db } from ".";
import { categorias, formasPagamento, lancamentos, recorrencias } from "./schema";
import { USUARIO_PADRAO } from "./usuario-padrao";

const userId = USUARIO_PADRAO.id;

export async function valoresConfirmadosRecentes(recorrenciaId: string, quantos: number) {
  const linhas = await db
    .select({ valor: lancamentos.valor })
    .from(lancamentos)
    .where(
      and(
        eq(lancamentos.userId, userId),
        eq(lancamentos.recorrenciaId, recorrenciaId),
        eq(lancamentos.status, "confirmado"),
      ),
    )
    .orderBy(desc(lancamentos.data))
    .limit(quantos);
  return linhas.map((l) => l.valor);
}

export async function gerarRecorrencias(hoje = hojeISO()) {
  const lista = await db
    .select({
      rec: recorrencias,
      categoriaNome: categorias.nome,
      categoriaTipo: categorias.tipo,
      diaFechamento: formasPagamento.diaFechamento,
      diaVencimento: formasPagamento.diaVencimento,
      formaTipo: formasPagamento.tipo,
    })
    .from(recorrencias)
    .innerJoin(categorias, eq(recorrencias.categoriaId, categorias.id))
    .leftJoin(formasPagamento, eq(recorrencias.formaPagamentoId, formasPagamento.id))
    .where(eq(recorrencias.userId, userId));

  let criados = 0;
  for (const { rec, categoriaNome, categoriaTipo, diaFechamento, diaVencimento, formaTipo } of lista) {
    const cartao = formaTipo === "credito" ? { diaFechamento, diaVencimento } : null;
    const pendentes = ocorrenciasPendentes(rec, cartao, hoje);
    if (pendentes.length === 0) continue;

    const variavel = rec.tipo === "fixa_variavel";
    let valor = rec.valor;
    if (variavel) {
      const recentes = await valoresConfirmadosRecentes(rec.id, rec.mesesMedia);
      valor = mediaEstimada(recentes, rec.mesesMedia, rec.valorEstimado ?? rec.valor);
    }

    const novos = await db
      .insert(lancamentos)
      .values(
        pendentes.map((o) => ({
          userId,
          data: o.data,
          dataCompra: o.dataCompra,
          competencia: o.competencia,
          descricao: rec.descricao,
          valor,
          categoriaId: rec.categoriaId,
          formaPagamentoId: rec.formaPagamentoId,
          tipo: categoriaTipo,
          subtipoEntrada: categoriaTipo === "entrada" ? subtipoDaCategoria(categoriaNome) : null,
          recorrenciaId: rec.id,
          parcela: o.parcela,
          status: variavel ? ("estimado" as const) : ("confirmado" as const),
        })),
      )
      .onConflictDoNothing()
      .returning({ id: lancamentos.id });
    criados += novos.length;

    await db
      .update(recorrencias)
      .set({ geradaAte: pendentes.at(-1)!.competencia })
      .where(eq(recorrencias.id, rec.id));
  }
  return criados;
}
