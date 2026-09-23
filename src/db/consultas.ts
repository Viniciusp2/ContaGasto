// Consultas do app. Toda consulta filtra pelo usuário (na Fase 5 vira o RLS + login).
import { and, asc, between, desc, eq } from "drizzle-orm";
import { intervaloDoMes, type Mes } from "@/lib/datas";
import { db } from ".";
import { categorias, emprestimos, formasPagamento, lancamentos } from "./schema";
import { USUARIO_PADRAO } from "./usuario-padrao";

const userId = USUARIO_PADRAO.id;

export type ItemLancamento = Awaited<ReturnType<typeof listarLancamentosDoMes>>[number];

export function listarLancamentosDoMes(mes: Mes) {
  const { inicio, fim } = intervaloDoMes(mes);
  return db
    .select({
      id: lancamentos.id,
      data: lancamentos.data,
      descricao: lancamentos.descricao,
      valor: lancamentos.valor,
      tipo: lancamentos.tipo,
      status: lancamentos.status,
      parcela: lancamentos.parcela,
      categoriaNome: categorias.nome,
      categoriaEmoji: categorias.emoji,
      categoriaCor: categorias.cor,
      formaNome: formasPagamento.nome,
    })
    .from(lancamentos)
    .innerJoin(categorias, eq(lancamentos.categoriaId, categorias.id))
    .leftJoin(formasPagamento, eq(lancamentos.formaPagamentoId, formasPagamento.id))
    .where(and(eq(lancamentos.userId, userId), between(lancamentos.data, inicio, fim)))
    .orderBy(desc(lancamentos.data), desc(lancamentos.createdAt));
}

// Só o que o calculos.ts precisa, do mês inteiro
export function lancamentosParaCalculo(mes: Mes) {
  const { inicio, fim } = intervaloDoMes(mes);
  return db
    .select({
      tipo: lancamentos.tipo,
      valor: lancamentos.valor,
      subtipoEntrada: lancamentos.subtipoEntrada,
      status: lancamentos.status,
    })
    .from(lancamentos)
    .where(and(eq(lancamentos.userId, userId), between(lancamentos.data, inicio, fim)));
}

// Empréstimos não dependem do mês: o que está em aberto conta até ser quitado
export function listarEmprestimosParaCalculo() {
  return db
    .select({ valor: emprestimos.valor, direcao: emprestimos.direcao, quitado: emprestimos.quitado })
    .from(emprestimos)
    .where(eq(emprestimos.userId, userId));
}

export async function buscarLancamento(id: string) {
  const [linha] = await db
    .select()
    .from(lancamentos)
    .where(and(eq(lancamentos.id, id), eq(lancamentos.userId, userId)));
  return linha ?? null;
}

export function listarCategoriasAtivas() {
  return db
    .select({
      id: categorias.id,
      nome: categorias.nome,
      emoji: categorias.emoji,
      cor: categorias.cor,
      tipo: categorias.tipo,
    })
    .from(categorias)
    .where(and(eq(categorias.userId, userId), eq(categorias.ativa, true)))
    .orderBy(asc(categorias.createdAt), asc(categorias.nome));
}

export function listarFormasPagamento() {
  return db
    .select({ id: formasPagamento.id, nome: formasPagamento.nome })
    .from(formasPagamento)
    .where(eq(formasPagamento.userId, userId))
    .orderBy(asc(formasPagamento.createdAt));
}

export async function buscarCategoria(id: string) {
  const [linha] = await db
    .select()
    .from(categorias)
    .where(and(eq(categorias.id, id), eq(categorias.userId, userId)));
  return linha ?? null;
}

export async function formaPagamentoExiste(id: string) {
  const [linha] = await db
    .select({ id: formasPagamento.id })
    .from(formasPagamento)
    .where(and(eq(formasPagamento.id, id), eq(formasPagamento.userId, userId)));
  return Boolean(linha);
}
