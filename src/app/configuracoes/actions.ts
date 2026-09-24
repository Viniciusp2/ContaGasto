"use server";

import { and, count, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  categorias,
  formasPagamento,
  lancamentos,
  recorrencias,
} from "@/db/schema";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import {
  categoriaProtegida,
  validarCategoria,
  validarForma,
} from "@/lib/categorias";
import { ehUuid } from "@/lib/validar-lancamento";

export type EstadoConfig = { erro?: string; ok?: boolean };

const userId = USUARIO_PADRAO.id;

// Mesmo nome (sem ligar pra maiúscula) no mesmo tipo confundiria os formulários
async function categoriaRepetida(
  nome: string,
  tipo: "gasto" | "entrada",
  semId?: string,
) {
  const achadas = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(
      and(
        eq(categorias.userId, userId),
        eq(categorias.tipo, tipo),
        sql`lower(${categorias.nome}) = lower(${nome})`,
        semId ? ne(categorias.id, semId) : undefined,
      ),
    );
  return achadas.length > 0;
}

async function formaRepetida(nome: string, semId?: string) {
  const achadas = await db
    .select({ id: formasPagamento.id })
    .from(formasPagamento)
    .where(
      and(
        eq(formasPagamento.userId, userId),
        sql`lower(${formasPagamento.nome}) = lower(${nome})`,
        semId ? ne(formasPagamento.id, semId) : undefined,
      ),
    );
  return achadas.length > 0;
}

// Cria (sem id) ou edita (com id). Na edição o tipo não muda: os lançamentos antigos dependem dele.
export async function salvarCategoria(
  _: EstadoConfig,
  fd: FormData,
): Promise<EstadoConfig> {
  const r = validarCategoria(fd);
  if (!r.ok) return { erro: r.erro };
  const id = String(fd.get("id") ?? "");

  if (!id) {
    if (await categoriaRepetida(r.dados.nome, r.dados.tipo))
      return { erro: "Já existe uma categoria com esse nome." };
    await db.insert(categorias).values({ userId, ...r.dados, emoji: "" });
  } else {
    if (!ehUuid(id)) return { erro: "Categoria não encontrada." };
    const [atual] = await db
      .select()
      .from(categorias)
      .where(and(eq(categorias.id, id), eq(categorias.userId, userId)));
    if (!atual) return { erro: "Categoria não encontrada." };
    if (categoriaProtegida(atual.nome) && r.dados.nome !== atual.nome) {
      return {
        erro: `O app usa o nome "${atual.nome}": dá pra trocar o ícone e a cor, mas não o nome.`,
      };
    }
    if (await categoriaRepetida(r.dados.nome, atual.tipo, id))
      return { erro: "Já existe uma categoria com esse nome." };
    await db
      .update(categorias)
      .set({ nome: r.dados.nome, icone: r.dados.icone, cor: r.dados.cor })
      .where(eq(categorias.id, id));
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// Desativar some dos formulários, mas o histórico continua com ela
export async function alternarCategoria(id: string) {
  if (!ehUuid(id)) return;
  const [atual] = await db
    .select()
    .from(categorias)
    .where(and(eq(categorias.id, id), eq(categorias.userId, userId)));
  if (!atual || categoriaProtegida(atual.nome)) return;
  await db
    .update(categorias)
    .set({ ativa: !atual.ativa })
    .where(eq(categorias.id, id));
  revalidatePath("/", "layout");
}

export async function salvarForma(
  _: EstadoConfig,
  fd: FormData,
): Promise<EstadoConfig> {
  const id = String(fd.get("id") ?? "");
  if (!id) {
    const r = validarForma(fd);
    if (!r.ok) return { erro: r.erro };
    if (await formaRepetida(r.dados.nome))
      return { erro: "Já existe uma forma de pagamento com esse nome." };
    await db.insert(formasPagamento).values({ userId, ...r.dados });
  } else {
    // Editar só troca o nome: o tipo decide fatura e VA
    const nome = String(fd.get("nome") ?? "")
      .trim()
      .replace(/\s+/g, " ");
    if (!ehUuid(id)) return { erro: "Forma não encontrada." };
    if (!nome || nome.length > 30)
      return { erro: "O nome precisa ter de 1 a 30 letras." };
    if (await formaRepetida(nome, id))
      return { erro: "Já existe uma forma de pagamento com esse nome." };
    const feitos = await db
      .update(formasPagamento)
      .set({ nome })
      .where(
        and(eq(formasPagamento.id, id), eq(formasPagamento.userId, userId)),
      )
      .returning({ id: formasPagamento.id });
    if (feitos.length === 0) return { erro: "Forma não encontrada." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// Só apaga forma que nunca foi usada (senão o histórico perderia a informação)
export async function apagarForma(
  _: EstadoConfig,
  fd: FormData,
): Promise<EstadoConfig> {
  const id = String(fd.get("id") ?? "");
  if (!ehUuid(id)) return { erro: "Forma não encontrada." };
  const [forma] = await db
    .select()
    .from(formasPagamento)
    .where(and(eq(formasPagamento.id, id), eq(formasPagamento.userId, userId)));
  if (!forma) return { erro: "Forma não encontrada." };
  if (forma.tipo === "beneficio")
    return { erro: "O vale alimentação é do app e não pode ser apagado." };

  const [usoLanc] = await db
    .select({ n: count() })
    .from(lancamentos)
    .where(eq(lancamentos.formaPagamentoId, id));
  const [usoRec] = await db
    .select({ n: count() })
    .from(recorrencias)
    .where(eq(recorrencias.formaPagamentoId, id));
  if (usoLanc.n + usoRec.n > 0) {
    return {
      erro: `Essa forma já foi usada em ${usoLanc.n + usoRec.n} lançamento(s) ou fixo(s), então fica, pra não apagar histórico.`,
    };
  }
  await db.delete(formasPagamento).where(eq(formasPagamento.id, id));
  revalidatePath("/", "layout");
  return { ok: true };
}
