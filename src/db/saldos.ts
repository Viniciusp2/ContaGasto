// Saldo em cada banco hoje: contas com o saldo informado + os lançamentos que vieram depois.
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { saldosNasContas } from "@/lib/saldos";
import { db } from ".";
import { contas, formasPagamento, lancamentos } from "./schema";
import { USUARIO_PADRAO } from "./usuario-padrao";

const userId = USUARIO_PADRAO.id;

export async function saldosHoje(hoje: string) {
  const [listaContas, movimentos] = await Promise.all([
    db.select().from(contas).where(eq(contas.userId, userId)),
    db
      .select({
        contaId: lancamentos.contaId,
        data: lancamentos.data,
        tipo: lancamentos.tipo,
        valor: lancamentos.valor,
        status: lancamentos.status,
        subtipoEntrada: lancamentos.subtipoEntrada,
        formaTipo: formasPagamento.tipo,
      })
      .from(lancamentos)
      .leftJoin(formasPagamento, eq(lancamentos.formaPagamentoId, formasPagamento.id))
      .where(and(eq(lancamentos.userId, userId), isNotNull(lancamentos.contaId))),
  ]);
  return saldosNasContas(listaContas, movimentos, hoje);
}

// Banco do último lançamento com banco: vem marcado no formulário pra não esquecer (e o saldo não ficar pra trás)
export async function ultimaContaUsada() {
  const [ultimo] = await db
    .select({ contaId: lancamentos.contaId })
    .from(lancamentos)
    .where(and(eq(lancamentos.userId, userId), isNotNull(lancamentos.contaId)))
    .orderBy(desc(lancamentos.createdAt))
    .limit(1);
  return ultimo?.contaId ?? null;
}
