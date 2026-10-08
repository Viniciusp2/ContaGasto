"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { apagarAparelho, enviarParaAparelhos, gravarAparelho, gravarPreferencias } from "@/db/push";
import { lembretes } from "@/db/schema";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import { lerInscricao, lerPreferencias, nomeDoAparelho } from "@/lib/avisos";
import { hojeISO } from "@/lib/datas";
import { aoConcluir, validarLembrete, type Repetir } from "@/lib/lembretes";
import { ehUuid } from "@/lib/validar-lancamento";

const userId = USUARIO_PADRAO.id;

export type EstadoLembrete = { erro?: string; ok?: boolean };

export async function criarLembrete(_: EstadoLembrete, fd: FormData): Promise<EstadoLembrete> {
  const r = validarLembrete(fd, hojeISO());
  if (!r.ok) return { erro: r.erro };
  await db.insert(lembretes).values({ userId, ...r.dados, inicio: r.dados.data });
  revalidatePath("/", "layout");
  return { ok: true };
}

// Feito: o de uma vez sai da lista; o que repete vai pra próxima vez
export async function concluirLembrete(id: string) {
  if (!ehUuid(id)) return;
  const [l] = await db.select().from(lembretes).where(and(eq(lembretes.id, id), eq(lembretes.userId, userId)));
  if (!l || l.concluido) return;
  const hoje = hojeISO();
  const r = aoConcluir({ inicio: l.inicio, data: l.data, repetir: l.repetir as Repetir }, hoje);
  await db
    .update(lembretes)
    .set({ data: r.data, concluido: r.concluido, concluidoEm: r.concluido ? hoje : null })
    .where(eq(lembretes.id, id));
  revalidatePath("/", "layout");
}

export async function apagarLembrete(id: string) {
  if (!ehUuid(id)) return;
  await db.delete(lembretes).where(and(eq(lembretes.id, id), eq(lembretes.userId, userId)));
  revalidatePath("/", "layout");
}

export async function salvarTiposAviso(tipos: Record<string, boolean>) {
  await gravarPreferencias(lerPreferencias(tipos));
  revalidatePath("/avisos");
}

// Este aparelho passa a receber notificação (ou confirma que continua: o navegador pode trocar a inscrição)
export async function inscreverAparelho(inscricao: unknown): Promise<{ ok: boolean; erro?: string }> {
  const i = lerInscricao(inscricao);
  if (!i) return { ok: false, erro: "O navegador mandou uma inscrição estranha. Tenta de novo." };
  await gravarAparelho(i, nomeDoAparelho((await headers()).get("user-agent") ?? ""));
  revalidatePath("/avisos");
  return { ok: true };
}

export async function desinscreverAparelho(filtro: { id?: string; endpoint?: string }) {
  if (filtro.id && !ehUuid(filtro.id)) return;
  await apagarAparelho(filtro);
  revalidatePath("/avisos");
}

export async function mandarTeste() {
  const r = await enviarParaAparelhos({
    titulo: "Bolso",
    corpo: "Pronto: as notificações estão ligadas. Os avisos chegam de manhã e à noite.",
    url: "/avisos",
    tag: "teste",
  });
  revalidatePath("/avisos");
  return r;
}
