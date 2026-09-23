"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { buscarCategoriaPorNome, buscarEmprestimo } from "@/db/consultas";
import { emprestimos, lancamentos } from "@/db/schema";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import { ehUuid } from "@/lib/validar-lancamento";
import { validarEmprestimo, validarQuitacao } from "@/lib/validar-emprestimo";

export type EstadoEmprestimo = { erro?: string; ok?: boolean };

const userId = USUARIO_PADRAO.id;
const doUsuario = (id: string) => and(eq(emprestimos.id, id), eq(emprestimos.userId, userId));

export async function criarEmprestimo(_: EstadoEmprestimo, formData: FormData): Promise<EstadoEmprestimo> {
  const r = validarEmprestimo(formData);
  if (!r.ok) return { erro: r.erro };
  const d = r.dados;
  await db.insert(emprestimos).values({
    userId,
    direcao: d.direcao,
    pessoa: d.pessoa,
    valor: d.valor,
    data: d.data,
    prazo: d.prazo,
    descricao: d.descricao || (d.direcao === "a_receber" ? `Emprestei pra ${d.pessoa}` : `Peguei com ${d.pessoa}`),
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

// modo: "recebi" (te pagaram), "paguei" (você pagou, vira gasto) ou "perdido" (não vai voltar, vira gasto)
export async function quitarEmprestimo(_: EstadoEmprestimo, formData: FormData): Promise<EstadoEmprestimo> {
  const id = String(formData.get("id") ?? "");
  const modo = String(formData.get("modo") ?? "");
  if (!ehUuid(id)) return { erro: "Empréstimo não encontrado." };

  const emprestimo = await buscarEmprestimo(id);
  if (!emprestimo) return { erro: "Empréstimo não encontrado." };
  if (emprestimo.quitado) return { erro: "Esse já foi quitado." };

  const esperado = emprestimo.direcao === "a_pagar" ? ["paguei"] : ["recebi", "perdido"];
  if (!esperado.includes(modo)) return { erro: "Ação inválida pra esse empréstimo." };

  const q = validarQuitacao(formData, emprestimo.data);
  if (!q.ok) return { erro: q.erro };

  // "Paguei": o valor pago inteiro vira gasto (decisão do Vinícius, 4.6). "Perdido": o valor emprestado.
  let lancamentoId: string | null = null;
  if (modo === "paguei" || modo === "perdido") {
    const nomeCategoria = modo === "paguei" ? "Pagamento de empréstimo" : "Outros";
    const categoria = await buscarCategoriaPorNome(nomeCategoria, "gasto");
    if (!categoria) return { erro: `Categoria "${nomeCategoria}" não encontrada.` };
    const [gasto] = await db
      .insert(lancamentos)
      .values({
        userId,
        tipo: "gasto",
        data: q.data,
        dataCompra: q.data,
        valor: modo === "paguei" ? (q.valor ?? emprestimo.valor) : emprestimo.valor,
        descricao:
          modo === "paguei" ? `Paguei empréstimo: ${emprestimo.pessoa}` : `Empréstimo não pago: ${emprestimo.pessoa}`,
        categoriaId: categoria.id,
      })
      .returning({ id: lancamentos.id });
    lancamentoId = gasto.id;
  }

  await db
    .update(emprestimos)
    .set({ quitado: true, dataQuitacao: q.data, perdido: modo === "perdido", lancamentoId })
    .where(doUsuario(id));

  revalidatePath("/", "layout");
  return { ok: true };
}

// Desfaz a quitação e apaga o gasto que ela criou
export async function reabrirEmprestimo(id: string) {
  if (!ehUuid(id)) return;
  const emprestimo = await buscarEmprestimo(id);
  if (!emprestimo) return;
  await db
    .update(emprestimos)
    .set({ quitado: false, dataQuitacao: null, perdido: false, lancamentoId: null })
    .where(doUsuario(id));
  if (emprestimo.lancamentoId) {
    await db
      .delete(lancamentos)
      .where(and(eq(lancamentos.id, emprestimo.lancamentoId), eq(lancamentos.userId, userId)));
  }
  revalidatePath("/", "layout");
}

export async function apagarEmprestimo(id: string) {
  if (!ehUuid(id)) return;
  const emprestimo = await buscarEmprestimo(id);
  if (!emprestimo) return;
  await db.delete(emprestimos).where(doUsuario(id));
  if (emprestimo.lancamentoId) {
    await db
      .delete(lancamentos)
      .where(and(eq(lancamentos.id, emprestimo.lancamentoId), eq(lancamentos.userId, userId)));
  }
  revalidatePath("/", "layout");
}
