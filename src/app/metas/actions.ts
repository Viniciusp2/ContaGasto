"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { buscarCategoria } from "@/db/consultas";
import { metas } from "@/db/schema";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import { MAX_CENTAVOS } from "@/lib/dinheiro";
import { ehUuid } from "@/lib/validar-lancamento";

export type EstadoMeta = { erro?: string; ok?: boolean };

const userId = USUARIO_PADRAO.id;

// Cria ou troca o limite da categoria (uma meta por categoria)
export async function salvarMeta(_: EstadoMeta, formData: FormData): Promise<EstadoMeta> {
  const categoriaId = String(formData.get("categoriaId") ?? "");
  const limite = Number(formData.get("limite") ?? "");
  if (!ehUuid(categoriaId)) return { erro: "Escolha uma categoria." };
  if (!Number.isInteger(limite) || limite <= 0 || limite > MAX_CENTAVOS) return { erro: "Digite um limite maior que zero." };

  const categoria = await buscarCategoria(categoriaId);
  if (!categoria || categoria.tipo !== "gasto") return { erro: "Meta é só pra categoria de gasto." };

  await db
    .insert(metas)
    .values({ userId, categoriaId, limiteMensal: limite })
    .onConflictDoUpdate({ target: [metas.userId, metas.categoriaId], set: { limiteMensal: limite } });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function apagarMeta(id: string) {
  if (!ehUuid(id)) return;
  await db.delete(metas).where(and(eq(metas.id, id), eq(metas.userId, userId)));
  revalidatePath("/", "layout");
}
