// Consultas do app. Toda consulta filtra pelo usuário (na Fase 5 vira o RLS + login).
import { and, asc, between, desc, eq, lte, or } from "drizzle-orm";
import { intervaloDoMes, type Mes } from "@/lib/datas";
import { db } from ".";
import { categorias, emprestimos, formasPagamento, lancamentos, recorrencias } from "./schema";
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
      totalParcelas: recorrencias.totalParcelas,
      dataCompra: lancamentos.dataCompra,
      categoriaNome: categorias.nome,
      categoriaEmoji: categorias.emoji,
      categoriaCor: categorias.cor,
      formaNome: formasPagamento.nome,
    })
    .from(lancamentos)
    .innerJoin(categorias, eq(lancamentos.categoriaId, categorias.id))
    .leftJoin(formasPagamento, eq(lancamentos.formaPagamentoId, formasPagamento.id))
    .leftJoin(recorrencias, eq(lancamentos.recorrenciaId, recorrencias.id))
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
      formaTipo: formasPagamento.tipo,
    })
    .from(lancamentos)
    .leftJoin(formasPagamento, eq(lancamentos.formaPagamentoId, formasPagamento.id))
    .where(and(eq(lancamentos.userId, userId), between(lancamentos.data, inicio, fim)));
}

// Tudo que mexeu no VA até o fim do mês: o saldo dele é acumulado (4.13)
export function lancamentosVAAte(mes: Mes) {
  const { fim } = intervaloDoMes(mes);
  return db
    .select({
      tipo: lancamentos.tipo,
      valor: lancamentos.valor,
      subtipoEntrada: lancamentos.subtipoEntrada,
      status: lancamentos.status,
      formaTipo: formasPagamento.tipo,
    })
    .from(lancamentos)
    .leftJoin(formasPagamento, eq(lancamentos.formaPagamentoId, formasPagamento.id))
    .where(
      and(
        eq(lancamentos.userId, userId),
        lte(lancamentos.data, fim),
        or(eq(lancamentos.subtipoEntrada, "beneficio"), eq(formasPagamento.tipo, "beneficio")),
      ),
    );
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
    .select({
      id: formasPagamento.id,
      nome: formasPagamento.nome,
      tipo: formasPagamento.tipo,
      diaFechamento: formasPagamento.diaFechamento,
      diaVencimento: formasPagamento.diaVencimento,
    })
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

export async function buscarFormaPagamento(id: string) {
  const [linha] = await db
    .select()
    .from(formasPagamento)
    .where(and(eq(formasPagamento.id, id), eq(formasPagamento.userId, userId)));
  return linha ?? null;
}

export function listarRecorrencias() {
  return db
    .select({
      rec: recorrencias,
      categoriaNome: categorias.nome,
      categoriaEmoji: categorias.emoji,
      categoriaCor: categorias.cor,
      categoriaTipo: categorias.tipo,
      formaNome: formasPagamento.nome,
      formaTipo: formasPagamento.tipo,
      diaFechamento: formasPagamento.diaFechamento,
      diaVencimento: formasPagamento.diaVencimento,
    })
    .from(recorrencias)
    .innerJoin(categorias, eq(recorrencias.categoriaId, categorias.id))
    .leftJoin(formasPagamento, eq(recorrencias.formaPagamentoId, formasPagamento.id))
    .where(eq(recorrencias.userId, userId))
    .orderBy(asc(recorrencias.diaDoMes), asc(recorrencias.createdAt));
}
