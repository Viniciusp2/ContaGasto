"use server";

import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { buscarCategoria, buscarConta, buscarFormaPagamento } from "@/db/consultas";
import { formasPagamento, lancamentos, recorrencias } from "@/db/schema";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import { hojeISO, mesDe, mesParaTexto, somarMeses } from "@/lib/datas";
import { geradaAteAoRetomar, quantasGeradas } from "@/lib/recorrencias";
import { lerModoApagar, validarEdicaoFixo } from "@/lib/validar-fixo";
import { ehUuid } from "@/lib/validar-lancamento";

// Encerrar não apaga nada: os lançamentos já gerados continuam no histórico
export async function encerrarRecorrencia(id: string) {
  if (!ehUuid(id)) return;
  await db
    .update(recorrencias)
    .set({ ativa: false, dataFim: hojeISO() })
    .where(and(eq(recorrencias.id, id), eq(recorrencias.userId, USUARIO_PADRAO.id)));
  revalidatePath("/", "layout");
}

// Pausar: para de gerar e sai dos compromissos. Só pra fixo (parcela de compra não pausa).
export async function pausarRecorrencia(id: string) {
  if (!ehUuid(id)) return;
  await db
    .update(recorrencias)
    .set({ ativa: false })
    .where(
      and(
        eq(recorrencias.id, id),
        eq(recorrencias.userId, USUARIO_PADRAO.id),
        isNull(recorrencias.dataFim),
        ne(recorrencias.tipo, "temporaria"),
      ),
    );
  revalidatePath("/", "layout");
}

// Retomar: volta a partir da próxima data, sem cobrar os meses que ficaram parados
export async function retomarRecorrencia(id: string) {
  if (!ehUuid(id)) return;
  const [linha] = await db
    .select({ rec: recorrencias, formaTipo: formasPagamento.tipo, diaFechamento: formasPagamento.diaFechamento, diaVencimento: formasPagamento.diaVencimento })
    .from(recorrencias)
    .leftJoin(formasPagamento, eq(recorrencias.formaPagamentoId, formasPagamento.id))
    .where(and(eq(recorrencias.id, id), eq(recorrencias.userId, USUARIO_PADRAO.id), isNull(recorrencias.dataFim)));
  if (!linha || linha.rec.ativa) return;
  const cartao = linha.formaTipo === "credito" ? { diaFechamento: linha.diaFechamento, diaVencimento: linha.diaVencimento } : null;
  await db
    .update(recorrencias)
    .set({ ativa: true, geradaAte: geradaAteAoRetomar(linha.rec, cartao, hojeISO()) })
    .where(eq(recorrencias.id, id));
  revalidatePath("/", "layout");
}

export type EstadoFixo = { erro?: string };

// Editar um fixo ou parcelado por completo. O que já foi pago fica como estava; se "aplicarNasAbertas",
// as que ainda estão a pagar (ou estimadas) recebem a mesma descrição, valor, categoria, forma e banco.
export async function editarFixo(_: EstadoFixo, fd: FormData): Promise<EstadoFixo> {
  const id = String(fd.get("id") ?? "");
  if (!ehUuid(id)) return { erro: "Fixo não encontrado." };
  const [rec] = await db.select().from(recorrencias).where(and(eq(recorrencias.id, id), eq(recorrencias.userId, USUARIO_PADRAO.id)));
  if (!rec) return { erro: "Fixo não encontrado." };

  const r = validarEdicaoFixo(fd, { tipo: rec.tipo, parcelasGeradas: quantasGeradas(rec) });
  if (!r.ok) return { erro: r.erro };
  const d = r.dados;

  const [categoriaAtual, categoria] = await Promise.all([buscarCategoria(rec.categoriaId), buscarCategoria(d.categoriaId)]);
  if (!categoria) return { erro: "Essa categoria não existe mais." };
  if (categoriaAtual && categoria.tipo !== categoriaAtual.tipo) return { erro: `A categoria tem que ser de ${categoriaAtual.tipo}.` };
  if (d.formaPagamentoId && !(await buscarFormaPagamento(d.formaPagamentoId))) return { erro: "Forma de pagamento inválida." };
  if (d.contaId && !(await buscarConta(d.contaId))) return { erro: "Esse banco não existe mais." };

  const variavel = rec.tipo === "fixa_variavel";
  await db.transaction(async (tx) => {
    await tx
      .update(recorrencias)
      .set({
        descricao: d.descricao,
        valor: d.valor,
        // Na conta que muda de valor, o digitado vira a estimativa enquanto não tem histórico
        ...(variavel ? { valorEstimado: d.valor } : {}),
        categoriaId: d.categoriaId,
        formaPagamentoId: d.formaPagamentoId,
        contaId: d.contaId,
        ...(rec.tipo === "temporaria" ? { totalParcelas: d.totalParcelas } : { diaDoMes: d.diaDoMes, diaUtil: d.diaUtil, sabadoUtil: d.sabadoUtil }),
        ...(variavel ? { diaVencimento: d.diaDoMes } : {}),
        tipoConta: categoria.tipo === "gasto" ? d.tipoConta : null,
        pagamentoAutomatico: categoria.tipo === "gasto" && d.automatico,
      })
      .where(eq(recorrencias.id, id));
    if (d.aplicarNasAbertas) {
      await tx
        .update(lancamentos)
        .set({
          descricao: d.descricao,
          ...(variavel ? {} : { valor: d.valor }), // a estimada continua com a média até você confirmar
          categoriaId: d.categoriaId,
          formaPagamentoId: d.formaPagamentoId,
          contaId: d.contaId,
        })
        .where(and(eq(lancamentos.recorrenciaId, id), eq(lancamentos.userId, USUARIO_PADRAO.id), inArray(lancamentos.status, ["a_pagar", "estimado"])));
    }
  });
  revalidatePath("/", "layout");
  redirect("/fixos?salvo=editado");
}

// Apagar de vez. "manter": o que já foi lançado fica no histórico (sem o vínculo);
// "abertos": apaga também o que ainda está a pagar; "tudo": apaga também o que já foi pago.
export async function apagarFixo(_: EstadoFixo, fd: FormData): Promise<EstadoFixo> {
  const id = String(fd.get("id") ?? "");
  const modo = lerModoApagar(String(fd.get("modo") ?? ""));
  if (!ehUuid(id) || !modo) return { erro: "Escolha o que fazer com o que já foi lançado." };
  if (String(fd.get("confirmacao") ?? "").trim().toUpperCase() !== "APAGAR") return { erro: "Digite APAGAR pra confirmar." };
  const [rec] = await db.select({ id: recorrencias.id }).from(recorrencias).where(and(eq(recorrencias.id, id), eq(recorrencias.userId, USUARIO_PADRAO.id)));
  if (!rec) return { erro: "Fixo não encontrado." };
  await db.transaction(async (tx) => {
    const doFixo = and(eq(lancamentos.recorrenciaId, id), eq(lancamentos.userId, USUARIO_PADRAO.id));
    if (modo === "tudo") await tx.delete(lancamentos).where(doFixo);
    if (modo === "abertos") await tx.delete(lancamentos).where(and(doFixo, inArray(lancamentos.status, ["a_pagar", "estimado"])));
    await tx.delete(recorrencias).where(eq(recorrencias.id, id));
  });
  revalidatePath("/", "layout");
  redirect("/fixos?salvo=apagado");
}

// Virar fixo: um lançamento que já existe passa a repetir todo mês a partir dele.
// O próprio lançamento vira a primeira vez (competência dele), então nada duplica.
export async function virarFixo(_: EstadoFixo, fd: FormData): Promise<EstadoFixo> {
  const id = String(fd.get("lancamentoId") ?? "");
  const tipo = String(fd.get("tipo") ?? "fixa");
  if (!ehUuid(id) || (tipo !== "fixa" && tipo !== "fixa_variavel")) return { erro: "Lançamento não encontrado." };
  const [l] = await db.select().from(lancamentos).where(and(eq(lancamentos.id, id), eq(lancamentos.userId, USUARIO_PADRAO.id)));
  if (!l) return { erro: "Lançamento não encontrado." };
  if (l.recorrenciaId) return { erro: "Esse lançamento já é de um fixo." };

  // No crédito a data do lançamento é o vencimento da fatura; o fixo conta a partir do dia da compra
  const inicio = l.dataCompra ?? l.data;
  const competencia = inicio.slice(0, 7);
  // Não inventa meses que já acabaram (eles já têm o que aconteceu de verdade, do extrato ou à mão):
  // a repetição começa no mês atual, no máximo
  const mesAnterior = mesParaTexto(somarMeses(mesDe(hojeISO()), -1));
  const geradaAte = competencia > mesAnterior ? competencia : mesAnterior;
  await db.transaction(async (tx) => {
    const [rec] = await tx
      .insert(recorrencias)
      .values({
        userId: USUARIO_PADRAO.id,
        tipo,
        descricao: l.descricao,
        valor: l.valor,
        diaDoMes: Number(inicio.slice(8, 10)),
        categoriaId: l.categoriaId,
        formaPagamentoId: l.formaPagamentoId,
        contaId: l.contaId,
        dataInicio: inicio,
        diaVencimento: tipo === "fixa_variavel" ? Number(inicio.slice(8, 10)) : null,
        valorEstimado: tipo === "fixa_variavel" ? l.valor : null,
        geradaAte,
        sabadoUtil: true,
      })
      .returning({ id: recorrencias.id });
    await tx.update(lancamentos).set({ recorrenciaId: rec.id, competencia }).where(eq(lancamentos.id, l.id));
  });
  revalidatePath("/", "layout");
  redirect("/fixos?salvo=fixo");
}
