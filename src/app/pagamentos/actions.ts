"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { buscarCategoria, buscarFormaPagamento } from "@/db/consultas";
import { buscarRecorrencia } from "@/db/pagamentos";
import { lancamentos, pagamentosFatura } from "@/db/schema";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import { dataValida, hojeISO } from "@/lib/datas";
import { MAX_CENTAVOS } from "@/lib/dinheiro";
import { ocorrencia } from "@/lib/recorrencias";
import { ehUuid } from "@/lib/validar-lancamento";

export type EstadoPagamento = { erro?: string; ok?: boolean };

const userId = USUARIO_PADRAO.id;
const COMPETENCIA = /^\d{4}-(0[1-9]|1[0-2])$/;

function lerPagamento(fd: FormData) {
  const pagoEm = String(fd.get("pagoEm") ?? "") || hojeISO();
  if (!dataValida(pagoEm)) return { erro: "Data do pagamento inválida." };
  if (pagoEm > hojeISO()) return { erro: "A data do pagamento não pode ser no futuro." };
  const textoValor = String(fd.get("valor") ?? "");
  const valor = textoValor ? Number(textoValor) : null;
  if (valor !== null && (!Number.isInteger(valor) || valor <= 0 || valor > MAX_CENTAVOS)) return { erro: "Valor inválido." };
  return { pagoEm, valor };
}

function pronto(): EstadoPagamento {
  revalidatePath("/", "layout");
  return { ok: true };
}

// Paguei: o gasto sai do saldo no dia do pagamento. O vencimento fica guardado.
export async function pagar(_: EstadoPagamento, fd: FormData): Promise<EstadoPagamento> {
  const lido = lerPagamento(fd);
  if ("erro" in lido) return { erro: lido.erro };
  const origem = String(fd.get("origem") ?? "");

  if (origem === "lancamento") {
    const id = String(fd.get("lancamentoId") ?? "");
    if (!ehUuid(id)) return { erro: "Conta não encontrada." };
    const [l] = await db.select().from(lancamentos).where(and(eq(lancamentos.id, id), eq(lancamentos.userId, userId)));
    if (!l || l.tipo !== "gasto") return { erro: "Conta não encontrada." };
    if (l.status === "confirmado") return pronto(); // já estava paga (dois toques): não mexe na data
    if (l.status === "estimado" && lido.valor === null) return { erro: "Diga quanto veio a conta." };
    await db
      .update(lancamentos)
      .set({
        status: "confirmado",
        data: lido.pagoEm,
        vencimento: l.vencimento ?? l.data,
        ...(lido.valor !== null ? { valor: lido.valor } : {}),
      })
      .where(eq(lancamentos.id, id));
    return pronto();
  }

  if (origem === "prevista") {
    // Pagou antes de vencer: cria o lançamento dessa ocorrência já pago. O gerador não duplica (índice único).
    const recorrenciaId = String(fd.get("recorrenciaId") ?? "");
    const competencia = String(fd.get("competencia") ?? "");
    if (!ehUuid(recorrenciaId) || !COMPETENCIA.test(competencia)) return { erro: "Conta não encontrada." };
    const rec = await buscarRecorrencia(recorrenciaId);
    if (!rec) return { erro: "Conta não encontrada." };
    const categoria = await buscarCategoria(rec.categoriaId);
    const forma = rec.formaPagamentoId ? await buscarFormaPagamento(rec.formaPagamentoId) : null;
    if (!categoria || categoria.tipo !== "gasto" || forma?.tipo === "credito") return { erro: "Essa conta não se paga por aqui." };

    // Acha a ocorrência dessa competência
    let o = null;
    for (let k = 0; k < 600; k++) {
      const atual = ocorrencia(rec, k, null);
      if (atual.competencia === competencia) {
        o = atual;
        break;
      }
      if (atual.competencia > competencia) break;
    }
    const passouDoFim =
      (rec.tipo === "temporaria" && (o?.parcela ?? 0) > (rec.totalParcelas ?? 0)) || (rec.dataFim !== null && o !== null && o.dataCompra > rec.dataFim);
    if (!o || passouDoFim) return { erro: "Essa conta não cai nesse mês." };
    if (rec.tipo === "fixa_variavel" && lido.valor === null) return { erro: "Diga quanto veio a conta." };

    await db
      .insert(lancamentos)
      .values({
        userId,
        data: lido.pagoEm,
        dataCompra: o.dataCompra,
        vencimento: o.data,
        competencia: o.competencia,
        descricao: rec.descricao,
        valor: lido.valor ?? rec.valor,
        categoriaId: rec.categoriaId,
        formaPagamentoId: rec.formaPagamentoId,
        tipo: "gasto",
        recorrenciaId: rec.id,
        parcela: o.parcela,
        status: "confirmado",
      })
      .onConflictDoNothing();
    return pronto();
  }

  if (origem === "fatura") {
    // Fatura paga é só controle: os gastos do cartão já contam no vencimento (4.4)
    const formaId = String(fd.get("formaId") ?? "");
    const competencia = String(fd.get("competencia") ?? "");
    if (!ehUuid(formaId) || !COMPETENCIA.test(competencia)) return { erro: "Fatura não encontrada." };
    const forma = await buscarFormaPagamento(formaId);
    if (!forma || forma.tipo !== "credito") return { erro: "Fatura não encontrada." };
    await db
      .insert(pagamentosFatura)
      .values({ userId, formaPagamentoId: formaId, competencia, pagoEm: lido.pagoEm })
      .onConflictDoUpdate({ target: [pagamentosFatura.formaPagamentoId, pagamentosFatura.competencia], set: { pagoEm: lido.pagoEm } });
    return pronto();
  }

  return { erro: "Conta não encontrada." };
}

// Desfaz o "Paguei": volta a ser a pagar, na data do vencimento
export async function desfazerPagamento(_: EstadoPagamento, fd: FormData): Promise<EstadoPagamento> {
  const origem = String(fd.get("origem") ?? "");
  if (origem === "fatura") {
    const formaId = String(fd.get("formaId") ?? "");
    const competencia = String(fd.get("competencia") ?? "");
    if (!ehUuid(formaId) || !COMPETENCIA.test(competencia)) return { erro: "Fatura não encontrada." };
    await db
      .delete(pagamentosFatura)
      .where(and(eq(pagamentosFatura.userId, userId), eq(pagamentosFatura.formaPagamentoId, formaId), eq(pagamentosFatura.competencia, competencia)));
    return pronto();
  }

  const id = String(fd.get("lancamentoId") ?? "");
  if (!ehUuid(id)) return { erro: "Conta não encontrada." };
  const [l] = await db.select().from(lancamentos).where(and(eq(lancamentos.id, id), eq(lancamentos.userId, userId)));
  if (!l || l.tipo !== "gasto") return { erro: "Conta não encontrada." };
  const forma = l.formaPagamentoId ? await buscarFormaPagamento(l.formaPagamentoId) : null;
  if (forma?.tipo === "credito" || forma?.tipo === "beneficio") return { erro: "Essa conta não se paga por aqui." };
  const vencimento = l.vencimento ?? l.data;
  await db.update(lancamentos).set({ status: "a_pagar", data: vencimento, vencimento }).where(eq(lancamentos.id, id));
  return pronto();
}
