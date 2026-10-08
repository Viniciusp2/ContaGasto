"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { buscarDoUsuario } from "@/db/conferir";
import { conferenciasIgnoradas, emprestimos, lancamentos } from "@/db/schema";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import { ehUuid } from "@/lib/validar-lancamento";

export type EstadoConferir = { erro?: string; ok?: string };
const userId = USUARIO_PADRAO.id;

function pronto(ok: string): EstadoConferir {
  revalidatePath("/", "layout");
  return { ok };
}

// A conta a pagar e o gasto que é o pagamento dela viram um só: a conta fica paga no dia do gasto
// (com banco, forma e observação dele) e o gasto solto sai, pra não contar duas vezes.
export async function juntarPagamento(_: EstadoConferir, fd: FormData): Promise<EstadoConferir> {
  const pendenteId = String(fd.get("pendenteId") ?? "");
  const pagamentoId = String(fd.get("pagamentoId") ?? "");
  if (!ehUuid(pendenteId) || !ehUuid(pagamentoId)) return { erro: "Não achei esses lançamentos." };
  const [p, g] = await Promise.all([buscarDoUsuario(pendenteId), buscarDoUsuario(pagamentoId)]);
  if (!p || !g || p.status === "confirmado" || g.status !== "confirmado" || p.valor !== g.valor) {
    return { erro: "Esses dois não batem mais. Atualize a tela." };
  }
  const [vinculo] = await db.select({ id: emprestimos.id }).from(emprestimos).where(eq(emprestimos.lancamentoId, g.id));
  if (vinculo) return { erro: "Esse gasto veio de um empréstimo. Resolva em Empréstimos." };
  const obs = [p.obs, g.obs].filter(Boolean).join(" | ") || null;
  await db.transaction(async (tx) => {
    await tx
      .update(lancamentos)
      .set({
        status: "confirmado",
        data: g.data,
        vencimento: p.vencimento ?? p.data,
        contaId: p.contaId ?? g.contaId,
        formaPagamentoId: p.formaPagamentoId ?? g.formaPagamentoId,
        obs,
      })
      .where(eq(lancamentos.id, p.id));
    await tx.delete(lancamentos).where(and(eq(lancamentos.id, g.id), eq(lancamentos.userId, userId)));
  });
  return pronto("Pronto: a conta ficou paga e o gasto repetido saiu.");
}

// "Está certo, são dois": o par não aparece mais
export async function marcarCerto(_: EstadoConferir, fd: FormData): Promise<EstadoConferir> {
  const chave = String(fd.get("chave") ?? "");
  if (!/^[0-9a-f-]{36}\|[0-9a-f-]{36}$/i.test(chave)) return { erro: "Par inválido." };
  await db.insert(conferenciasIgnoradas).values({ userId, chave }).onConflictDoNothing();
  return pronto("Anotado: esses dois ficam.");
}

// Apaga um dos repetidos (o que você escolheu)
export async function apagarRepetido(_: EstadoConferir, fd: FormData): Promise<EstadoConferir> {
  const id = String(fd.get("id") ?? "");
  if (!ehUuid(id)) return { erro: "Lançamento não encontrado." };
  const l = await buscarDoUsuario(id);
  if (!l) return { erro: "Lançamento não encontrado." };
  const [vinculo] = await db.select({ id: emprestimos.id }).from(emprestimos).where(eq(emprestimos.lancamentoId, id));
  if (vinculo) return { erro: "Esse gasto veio de um empréstimo. Resolva em Empréstimos." };
  await db.delete(lancamentos).where(and(eq(lancamentos.id, id), eq(lancamentos.userId, userId)));
  return pronto("Apagado.");
}
