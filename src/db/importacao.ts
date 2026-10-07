// Importação de lançamentos (ex.: extrato do banco). Tudo numa transação: ou entra tudo, ou nada.
import { and, between, eq } from "drizzle-orm";
import { separarNovos, type LinhaImportacao } from "@/lib/importacao";
import { subtipoDaCategoria } from "@/lib/entradas";
import { seloDoBanco } from "@/lib/bancos";
import { db } from ".";
import { categorias, contas, formasPagamento, lancamentos } from "./schema";
import { USUARIO_PADRAO } from "./usuario-padrao";

const userId = USUARIO_PADRAO.id;

export async function importarLinhas(linhas: LinhaImportacao[]) {
  const cats = await db.select().from(categorias).where(eq(categorias.userId, userId));
  const formas = await db.select().from(formasPagamento).where(eq(formasPagamento.userId, userId));
  const achaCategoria = (nome: string, tipo: "gasto" | "entrada") =>
    cats.find((c) => c.tipo === tipo && c.nome.toLowerCase() === nome.toLowerCase()) ??
    cats.find((c) => c.tipo === tipo && c.nome === "Outros")!;
  // Banco novo é criado com o selo dele (sigla e cor)
  const listaContas = await db.select().from(contas).where(eq(contas.userId, userId));
  for (const nome of new Set(linhas.map((l) => l.conta).filter((c): c is string => Boolean(c)))) {
    if (listaContas.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) continue;
    const [nova] = await db.insert(contas).values({ userId, nome, ...seloDoBanco(nome) }).returning();
    listaContas.push(nova);
  }
  const achaConta = (nome: string | null) => (nome ? (listaContas.find((c) => c.nome.toLowerCase() === nome.toLowerCase()) ?? null) : null);
  const achaForma = (nome: string | null) => (nome ? (formas.find((f) => f.nome.toLowerCase() === nome.toLowerCase()) ?? null) : null);

  // O que já existe no período, pra não duplicar
  const datas = linhas.map((l) => l.data).sort();
  const existentes = await db
    .select({ data: lancamentos.data, valor: lancamentos.valor, tipo: lancamentos.tipo, descricao: lancamentos.descricao })
    .from(lancamentos)
    .where(and(eq(lancamentos.userId, userId), between(lancamentos.data, datas[0], datas.at(-1)!)));
  const { novos, repetidos } = separarNovos(linhas, existentes);

  const valores = novos.map((l) => {
    const categoria = achaCategoria(l.categoria, l.tipo);
    const forma = achaForma(l.forma);
    return {
      userId,
      data: l.data,
      dataCompra: l.data,
      descricao: l.descricao,
      valor: l.valor,
      tipo: l.tipo,
      categoriaId: categoria.id,
      formaPagamentoId: forma?.id ?? null,
      contaId: achaConta(l.conta)?.id ?? null,
      subtipoEntrada: l.tipo === "entrada" ? subtipoDaCategoria(categoria.nome) : null,
      obs: l.obs,
      status: "confirmado" as const,
    };
  });

  await db.transaction(async (tx) => {
    for (let i = 0; i < valores.length; i += 500) await tx.insert(lancamentos).values(valores.slice(i, i + 500));
  });

  const meses = [...new Set(novos.map((l) => l.data.slice(0, 7)))].sort().map((m) => `${m.slice(5)}/${m.slice(0, 4)}`);
  return { importados: novos.length, repetidos, meses };
}
