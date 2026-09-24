"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { formasPagamento, recorrencias } from "@/db/schema";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import { hojeISO } from "@/lib/datas";
import { geradaAteAoRetomar } from "@/lib/recorrencias";
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
