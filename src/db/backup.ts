// Backup completo do usuário (Sprint 4.3). Restaurar apaga tudo e põe o backup no lugar, numa transação só.
import { eq } from "drizzle-orm";
import { TABELAS_BACKUP, VERSAO_BACKUP, prepararLinha, type Backup, type TabelaBackup } from "@/lib/backup";
import { db } from ".";
import {
  categorias,
  emprestimos,
  formasPagamento,
  lancamentos,
  metas,
  movimentosObjetivo,
  objetivos,
  recorrencias,
} from "./schema";
import { USUARIO_PADRAO } from "./usuario-padrao";

const userId = USUARIO_PADRAO.id;

const tabelas = {
  categorias,
  formasPagamento,
  recorrencias,
  lancamentos,
  metas,
  objetivos,
  movimentosObjetivo,
  emprestimos,
} satisfies Record<TabelaBackup, unknown>;

export async function exportarTudo(): Promise<Backup> {
  const dados = {} as Backup["dados"];
  for (const nome of TABELAS_BACKUP) {
    const t = tabelas[nome];
    dados[nome] = (await db.select().from(t).where(eq(t.userId, userId))) as Record<string, unknown>[];
  }
  return { app: "bolso", versao: VERSAO_BACKUP, geradoEm: new Date().toISOString(), dados };
}

// Tudo ou nada: se qualquer linha falhar, nada muda
export async function restaurarTudo(backup: Backup) {
  await db.transaction(async (tx) => {
    // Empréstimo aponta pro lançamento que ele gerou: solta antes de apagar
    await tx.update(emprestimos).set({ lancamentoId: null }).where(eq(emprestimos.userId, userId));
    for (const nome of [...TABELAS_BACKUP].reverse()) {
      const t = tabelas[nome];
      await tx.delete(t).where(eq(t.userId, userId));
    }
    for (const nome of TABELAS_BACKUP) {
      const linhas = backup.dados[nome].map((l) => prepararLinha(l, userId));
      // Em blocos, pra não estourar o limite de parâmetros do Postgres
      for (let i = 0; i < linhas.length; i += 500) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await tx.insert(tabelas[nome]).values(linhas.slice(i, i + 500) as any);
      }
    }
  });
}
