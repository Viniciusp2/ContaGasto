"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { buscarCategoria, formaPagamentoExiste } from "@/db/consultas";
import { lancamentos } from "@/db/schema";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import { mesDe, mesParaTexto } from "@/lib/datas";
import { subtipoDaCategoria } from "@/lib/entradas";
import { ehUuid, validarLancamento } from "@/lib/validar-lancamento";

export type EstadoForm = { erro?: string };

// Cria (sem "id" no formulário) ou edita (com "id"). Só valor, categoria e data são obrigatórios.
export async function salvarLancamento(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const resultado = validarLancamento(formData);
  if (!resultado.ok) return { erro: resultado.erro };
  const d = resultado.dados;

  const categoria = await buscarCategoria(d.categoriaId);
  if (!categoria || !categoria.ativa) return { erro: "Essa categoria não existe mais." };
  if (categoria.tipo !== d.tipo) return { erro: "Essa categoria não é de " + d.tipo + "." };

  if (d.formaPagamentoId && !(await formaPagamentoExiste(d.formaPagamentoId))) {
    return { erro: "Forma de pagamento inválida." };
  }

  const valores = {
    data: d.data,
    descricao: d.descricao || categoria.nome,
    valor: d.valor,
    categoriaId: d.categoriaId,
    formaPagamentoId: d.formaPagamentoId,
    tipo: d.tipo,
    subtipoEntrada: d.tipo === "entrada" ? subtipoDaCategoria(categoria.nome) : null,
    obs: d.obs,
  };

  const id = String(formData.get("id") ?? "");
  if (id) {
    if (!ehUuid(id)) return { erro: "Lançamento não encontrado." };
    const editados = await db
      .update(lancamentos)
      .set(valores)
      .where(and(eq(lancamentos.id, id), eq(lancamentos.userId, USUARIO_PADRAO.id)))
      .returning({ id: lancamentos.id });
    if (editados.length === 0) return { erro: "Lançamento não encontrado." };
  } else {
    await db.insert(lancamentos).values({ ...valores, userId: USUARIO_PADRAO.id });
  }

  revalidatePath("/", "layout");
  // Volta pra lista do mês do lançamento, pra ele aparecer na tela
  redirect(`/lancamentos?mes=${mesParaTexto(mesDe(d.data))}`);
}

export async function apagarLancamento(id: string, mes: string) {
  if (!ehUuid(id)) return;
  await db
    .delete(lancamentos)
    .where(and(eq(lancamentos.id, id), eq(lancamentos.userId, USUARIO_PADRAO.id)));
  revalidatePath("/", "layout");
  redirect(`/lancamentos?mes=${encodeURIComponent(mes)}`);
}
