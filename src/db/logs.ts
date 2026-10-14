// Logs da área Dev: o que a IA fez, erros e testes. Gravar log nunca pode derrubar o app.
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { db } from ".";
import { logs } from "./schema";
import { USUARIO_PADRAO } from "./usuario-padrao";
import { limparDetalhe, type NivelLog } from "@/lib/dev";

const userId = USUARIO_PADRAO.id;
export const DIAS_DE_LOG = 30;

export async function registrar(nivel: NivelLog, origem: string, mensagem: string, detalhe?: Record<string, unknown>) {
  try {
    await db.insert(logs).values({ userId, nivel, origem, mensagem: mensagem.slice(0, 500), detalhe: detalhe ? limparDetalhe(detalhe) : null });
  } catch (erro) {
    console.error("[logs] não gravou", erro);
  }
}

export function listarLogs({ nivel, origem, limite = 200 }: { nivel?: NivelLog; origem?: string; limite?: number }) {
  return db
    .select({ id: logs.id, nivel: logs.nivel, origem: logs.origem, mensagem: logs.mensagem, detalhe: logs.detalhe, em: logs.createdAt })
    .from(logs)
    .where(and(eq(logs.userId, userId), nivel ? eq(logs.nivel, nivel) : undefined, origem ? eq(logs.origem, origem) : undefined))
    .orderBy(desc(logs.createdAt))
    .limit(limite);
}

export async function origensDosLogs() {
  const linhas = await db.selectDistinct({ origem: logs.origem }).from(logs).where(eq(logs.userId, userId));
  return linhas.map((l) => l.origem).sort();
}

// Log velho some sozinho (roda quando a área Dev abre)
export async function apagarLogsAntigos() {
  await db.delete(logs).where(and(eq(logs.userId, userId), lt(logs.createdAt, sql`now() - make_interval(days => ${DIAS_DE_LOG})`)));
}

export async function apagarTodosOsLogs() {
  await db.delete(logs).where(eq(logs.userId, userId));
}
