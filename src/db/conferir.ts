// Dados da tela Conferir: tudo do usuário, os pares marcados como "está certo" e os saldos dos bancos.
import { and, eq } from "drizzle-orm";
import { db } from ".";
import { categorias, conferenciasIgnoradas, contas, lancamentos } from "./schema";
import { USUARIO_PADRAO } from "./usuario-padrao";

const userId = USUARIO_PADRAO.id;

export async function dadosDaConferencia() {
  const [lista, ignorados, bancos] = await Promise.all([
    db
      .select({
        id: lancamentos.id,
        data: lancamentos.data,
        vencimento: lancamentos.vencimento,
        valor: lancamentos.valor,
        tipo: lancamentos.tipo,
        status: lancamentos.status,
        descricao: lancamentos.descricao,
        obs: lancamentos.obs,
        contaId: lancamentos.contaId,
        recorrenciaId: lancamentos.recorrenciaId,
        categoriaNome: categorias.nome,
        contaNome: contas.nome,
      })
      .from(lancamentos)
      .innerJoin(categorias, eq(lancamentos.categoriaId, categorias.id))
      .leftJoin(contas, eq(lancamentos.contaId, contas.id))
      .where(eq(lancamentos.userId, userId)),
    db.select({ chave: conferenciasIgnoradas.chave }).from(conferenciasIgnoradas).where(eq(conferenciasIgnoradas.userId, userId)),
    db.select().from(contas).where(eq(contas.userId, userId)),
  ]);
  const informados = bancos.map((b) => b.saldoBaseEm).filter((d): d is string => Boolean(d)).sort();
  return { lista, ignorados: new Set(ignorados.map((i) => i.chave)), primeiroSaldoInformado: informados[0] ?? null };
}

export async function buscarDoUsuario(id: string) {
  const [l] = await db.select().from(lancamentos).where(and(eq(lancamentos.id, id), eq(lancamentos.userId, userId)));
  return l ?? null;
}
