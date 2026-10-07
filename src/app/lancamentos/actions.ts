"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { buscarCategoria, buscarConta, buscarFormaPagamento } from "@/db/consultas";
import { gerarRecorrencias } from "@/db/gerar-recorrencias";
import { lancamentos, recorrencias } from "@/db/schema";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import { mesDe, mesParaTexto } from "@/lib/datas";
import { subtipoDaCategoria } from "@/lib/entradas";
import { dataEfetiva, primeiroDiaUtilAPartirDe } from "@/lib/recorrencias";
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
  // VA recebido é a categoria "Vale alimentação"; a forma VA é só pra pagar (4.13)
  if (forma?.tipo === "beneficio" && d.tipo === "entrada") {
    return { erro: "Pra registrar o VA recebido, use a categoria Vale alimentação sem forma de pagamento." };
  }

  if (d.contaId && !(await buscarConta(d.contaId))) return { erro: "Essa conta não existe mais." };

  const descricao = d.descricao || categoria.nome;
  const id = String(formData.get("id") ?? "");

  // Repete: vira recorrência e o gerador cria os lançamentos quando a data chegar
  if (!id && d.repetir !== "unico") {
    // No dia útil, a primeira vez é o próximo Nº dia útil a partir da data escolhida
    const inicio = d.diaUtil !== null ? primeiroDiaUtilAPartirDe(d.data, d.diaUtil, d.sabadoUtil) : d.data;
    await db.insert(recorrencias).values({
      userId,
      tipo: d.repetir,
      descricao,
      valor: d.valor,
      diaDoMes: Number(inicio.slice(8, 10)),
      diaUtil: d.diaUtil,
      sabadoUtil: d.sabadoUtil,
      categoriaId: d.categoriaId,
      formaPagamentoId: d.formaPagamentoId,
      totalParcelas: d.parcelas,
      dataInicio: inicio,
      diaVencimento: d.repetir === "fixa_variavel" ? Number(inicio.slice(8, 10)) : null,
      valorEstimado: d.repetir === "fixa_variavel" ? d.valor : null,
      tipoConta: d.tipoConta,
      pagamentoAutomatico: d.automatico,
    });
    await gerarRecorrencias();
    revalidatePath("/", "layout");
    redirect(formData.get("voltar") === "pagamentos" ? "/pagamentos?salvo=conta" : "/fixos?salvo=fixo");
  }

  // No crédito com fatura configurada, o gasto entra no vencimento (4.4)
  const cartao = forma?.tipo === "credito" ? forma : null;
  // Gasto ainda não pago fica "a pagar": não sai do saldo até marcar Paguei, e a data é o vencimento.
  // Crédito segue a fatura e VA tem saldo próprio, então esses contam direto.
  const aPagar = d.tipo === "gasto" && !d.pago && !cartao && forma?.tipo !== "beneficio";
  const valores = {
    data: d.tipo === "gasto" ? dataEfetiva(d.data, cartao) : d.data,
    dataCompra: d.data,
    descricao,
    valor: d.valor,
    categoriaId: d.categoriaId,
    formaPagamentoId: d.formaPagamentoId,
    contaId: d.contaId,
    tipo: d.tipo,
    subtipoEntrada: d.tipo === "entrada" ? subtipoDaCategoria(categoria.nome) : null,
    obs: d.obs,
    holerite: d.holerite,
  };

  if (id) {
    if (!ehUuid(id)) return { erro: "Lançamento não encontrado." };
    const editados = await db
      .update(lancamentos)
      // Salvar a edição confirma o valor (fixa variável deixa de ser estimada, 4.8); pago ou não vem do formulário
      .set({ ...valores, status: aPagar ? "a_pagar" : "confirmado", ...(aPagar ? { vencimento: d.data } : {}) })
      .where(and(eq(lancamentos.id, id), eq(lancamentos.userId, userId)))
      .returning({ id: lancamentos.id });
    if (editados.length === 0) return { erro: "Lançamento não encontrado." };
  } else {
    await db
      .insert(lancamentos)
      .values({ ...valores, userId, status: aPagar ? "a_pagar" : "confirmado", vencimento: aPagar ? d.data : null });
  }

  revalidatePath("/", "layout");
  // Volta pra lista do mês em que o dinheiro sai, pra ele aparecer na tela
  redirect(`/lancamentos?mes=${mesParaTexto(mesDe(valores.data))}&salvo=${id ? "editado" : d.tipo}`);
}

export async function apagarLancamento(id: string, mes: string) {
  if (!ehUuid(id)) return;
  await db.delete(lancamentos).where(and(eq(lancamentos.id, id), eq(lancamentos.userId, userId)));
  revalidatePath("/", "layout");
  redirect(`/lancamentos?mes=${encodeURIComponent(mes)}`);
}
