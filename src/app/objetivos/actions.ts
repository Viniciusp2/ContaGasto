"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { buscarObjetivo, saldoDoObjetivo } from "@/db/consultas";
import { movimentosObjetivo, objetivos } from "@/db/schema";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import { validarMovimento, validarObjetivo } from "@/lib/objetivos";
import { ehUuid } from "@/lib/validar-lancamento";

export type EstadoObjetivo = { erro?: string; ok?: boolean };

const userId = USUARIO_PADRAO.id;

export async function criarObjetivo(_: EstadoObjetivo, formData: FormData): Promise<EstadoObjetivo> {
  const r = validarObjetivo(formData);
  if (!r.ok) return { erro: r.erro };
  await db.insert(objetivos).values({ userId, ...r.dados });
  revalidatePath("/", "layout");
  return { ok: true };
}

// Guardar (+) ou resgatar (−). Não é gasto nem entrada: só muda o saldo da caixinha.
export async function movimentarObjetivo(_: EstadoObjetivo, formData: FormData): Promise<EstadoObjetivo> {
  const objetivoId = String(formData.get("objetivoId") ?? "");
  if (!ehUuid(objetivoId) || !(await buscarObjetivo(objetivoId))) return { erro: "Objetivo não encontrado." };

  const r = validarMovimento(formData, await saldoDoObjetivo(objetivoId));
  if (!r.ok) return { erro: r.erro };

  await db.insert(movimentosObjetivo).values({ userId, objetivoId, valor: r.valor, data: r.data });
  revalidatePath("/", "layout");
  return { ok: true };
}

// Apaga o objetivo e o histórico dele. O dinheiro nunca saiu da conta, então nada muda nos saldos.
export async function apagarObjetivo(id: string) {
  if (!ehUuid(id)) return;
  await db.delete(objetivos).where(and(eq(objetivos.id, id), eq(objetivos.userId, userId)));
  revalidatePath("/", "layout");
}
