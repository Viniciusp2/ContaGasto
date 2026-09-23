"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { recorrencias } from "@/db/schema";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import { hojeISO } from "@/lib/datas";
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
