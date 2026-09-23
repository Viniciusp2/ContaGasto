"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { buscarCategoria, buscarFormaPagamento } from "@/db/consultas";
import { gerarRecorrencias } from "@/db/gerar-recorrencias";
import { lancamentos, recorrencias } from "@/db/schema";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import { mesDe, mesParaTexto } from "@/lib/datas";
import { subtipoDaCategoria } from "@/lib/entradas";
import { dataEfetiva } from "@/lib/recorrencias";
import { ehUuid, validarLancamento } from "@/lib/validar-lancamento";

export type EstadoForm = { erro?: string };

const userId = USUARIO_PADRAO.id;

// Cria (sem "id" no formulário) ou edita (com "id"). Só valor, categoria e data são obrigatórios.
export async function salvarLancamento(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const resultado = validarLancamento(formData);
  if (!resultado.ok) return { erro: resultado.erro };
  const d = resultado.dados;

  const categoria = await buscarCategoria(d.categoriaId);
  if (!categoria || !categoria.ativa) return { erro: "Essa categoria não existe mais." };
  if (categoria.tipo !== d.tipo) return { erro: "Essa categoria não é de " + d.tipo + "." };

  const forma = d.formaPagamentoId ? await buscarFormaPagamento(d.formaPagamentoId) : null;
  if (d.formaPagamentoId && !forma) return { erro: "Forma de pagamento inválida." };

  const descricao = d.descricao || categoria.nome;
  const id = String(formData.get("id") ?? "");

  // Repete: vira recorrência e o gerador cria os lançamentos quando a data chegar
  if (!id && d.repetir !== "unico") {
    await db.insert(recorrencias).values({
      userId,
      tipo: d.repetir,
      descricao,
      valor: d.valor,
      diaDoMes: Number(d.data.slice(8, 10)),
      categoriaId: d.categoriaId,
      formaPagamentoId: d.formaPagamentoId,
      totalParcelas: d.parcelas,
      dataInicio: d.data,
      diaVencimento: d.repetir === "fixa_variavel" ? Number(d.data.slice(8, 10)) : null,
      valorEstimado: d.repetir === "fixa_variavel" ? d.valor : null,
    });
    await gerarRecorrencias();
    revalidatePath("/", "layout");
    redirect("/fixos");
  }

  // No crédito com fatura configurada, o gasto entra no vencimento (4.4)
  const cartao = forma?.tipo === "credito" ? forma : null;
  const valores = {
    data: d.tipo === "gasto" ? dataEfetiva(d.data, cartao) : d.data,
    dataCompra: d.data,
    descricao,
    valor: d.valor,
    categoriaId: d.categoriaId,
    formaPagamentoId: d.formaPagamentoId,
    tipo: d.tipo,
    subtipoEntrada: d.tipo === "entrada" ? subtipoDaCategoria(categoria.nome) : null,
    obs: d.obs,
  };

  if (id) {
    if (!ehUuid(id)) return { erro: "Lançamento não encontrado." };
    const editados = await db
      .update(lancamentos)
      // Salvar a edição confirma o valor (fixa variável deixa de ser estimada, 4.8)
      .set({ ...valores, status: "confirmado" })
      .where(and(eq(lancamentos.id, id), eq(lancamentos.userId, userId)))
      .returning({ id: lancamentos.id });
    if (editados.length === 0) return { erro: "Lançamento não encontrado." };
  } else {
    await db.insert(lancamentos).values({ ...valores, userId });
  }

  revalidatePath("/", "layout");
  // Volta pra lista do mês em que o dinheiro sai, pra ele aparecer na tela
  redirect(`/lancamentos?mes=${mesParaTexto(mesDe(valores.data))}`);
}

export async function apagarLancamento(id: string, mes: string) {
  if (!ehUuid(id)) return;
  await db.delete(lancamentos).where(and(eq(lancamentos.id, id), eq(lancamentos.userId, userId)));
  revalidatePath("/", "layout");
  redirect(`/lancamentos?mes=${encodeURIComponent(mes)}`);
}
