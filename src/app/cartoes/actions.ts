"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { formasPagamento } from "@/db/schema";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import { ehUuid } from "@/lib/validar-lancamento";

export type EstadoCartao = { erro?: string; ok?: boolean };

function lerDia(formData: FormData, campo: string): number | null | "invalido" {
  const texto = String(formData.get(campo) ?? "").trim();
  if (!texto) return null;
  const dia = Number(texto);
  return Number.isInteger(dia) && dia >= 1 && dia <= 31 ? dia : "invalido";
}

// Vale pras compras novas. O que já foi lançado fica com a data que tinha.
export async function salvarCartao(_anterior: EstadoCartao, formData: FormData): Promise<EstadoCartao> {
  const id = String(formData.get("id") ?? "");
  if (!ehUuid(id)) return { erro: "Cartão não encontrado." };

  const diaFechamento = lerDia(formData, "diaFechamento");
  const diaVencimento = lerDia(formData, "diaVencimento");
  if (diaFechamento === "invalido" || diaVencimento === "invalido") return { erro: "Use um dia de 1 a 31." };
  if ((diaFechamento === null) !== (diaVencimento === null)) {
    return { erro: "Preencha os dois dias, ou deixe os dois vazios." };
  }

  const salvos = await db
    .update(formasPagamento)
    .set({ diaFechamento, diaVencimento })
    .where(
      and(
        eq(formasPagamento.id, id),
        eq(formasPagamento.userId, USUARIO_PADRAO.id),
        eq(formasPagamento.tipo, "credito"),
      ),
    )
    .returning({ id: formasPagamento.id });
  if (salvos.length === 0) return { erro: "Cartão não encontrado." };

  revalidatePath("/", "layout");
  return { ok: true };
}
