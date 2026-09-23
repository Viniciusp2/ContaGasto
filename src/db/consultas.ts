// Consultas do app. Toda consulta filtra pelo usuário (na Fase 5 vira o RLS + login).
import { and, asc, between, desc, eq, lte, or, sql } from "drizzle-orm";
import { intervaloDoMes, type Mes } from "@/lib/datas";
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
      categoriaIcone: categorias.icone,
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
      categoriaId: lancamentos.categoriaId,
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
    .select({
      valor: emprestimos.valor,
      direcao: emprestimos.direcao,
      quitado: emprestimos.quitado,
      data: emprestimos.data,
      dataQuitacao: emprestimos.dataQuitacao,
    })
    .from(emprestimos)
    .where(eq(emprestimos.userId, userId));
}

export function listarEmprestimos() {
  return db
    .select()
    .from(emprestimos)
    .where(eq(emprestimos.userId, userId))
    .orderBy(desc(emprestimos.data), desc(emprestimos.createdAt));
}

export async function buscarEmprestimo(id: string) {
  const [linha] = await db
    .select()
    .from(emprestimos)
    .where(and(eq(emprestimos.id, id), eq(emprestimos.userId, userId)));
  return linha ?? null;
}

export async function buscarCategoriaPorNome(nome: string, tipo: "gasto" | "entrada") {
  const [linha] = await db
    .select()
    .from(categorias)
    .where(and(eq(categorias.userId, userId), eq(categorias.nome, nome), eq(categorias.tipo, tipo)));
  return linha ?? null;
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
      icone: categorias.icone,
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
      categoriaIcone: categorias.icone,
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

export function listarMetas() {
  return db
    .select({
      id: metas.id,
      categoriaId: metas.categoriaId,
      limiteMensal: metas.limiteMensal,
      categoriaNome: categorias.nome,
      categoriaIcone: categorias.icone,
      categoriaCor: categorias.cor,
    })
    .from(metas)
    .innerJoin(categorias, eq(metas.categoriaId, categorias.id))
    .where(eq(metas.userId, userId))
    .orderBy(asc(categorias.nome));
}

// Saldo de cada objetivo = soma dos movimentos (nunca gravado, 4.7)
export function listarObjetivos() {
  return db
    .select({
      id: objetivos.id,
      nome: objetivos.nome,
      icone: objetivos.icone,
      valorAlvo: objetivos.valorAlvo,
      dataAlvo: objetivos.dataAlvo,
      saldo: sql<number>`coalesce(sum(${movimentosObjetivo.valor}), 0)::int`,
    })
    .from(objetivos)
    .leftJoin(movimentosObjetivo, eq(movimentosObjetivo.objetivoId, objetivos.id))
    .where(eq(objetivos.userId, userId))
    .groupBy(objetivos.id)
    .orderBy(asc(objetivos.dataAlvo));
}

export async function saldoDoObjetivo(objetivoId: string) {
  const [linha] = await db
    .select({ saldo: sql<number>`coalesce(sum(${movimentosObjetivo.valor}), 0)::int` })
    .from(movimentosObjetivo)
    .where(and(eq(movimentosObjetivo.objetivoId, objetivoId), eq(movimentosObjetivo.userId, userId)));
  return linha?.saldo ?? 0;
}

export async function buscarObjetivo(id: string) {
  const [linha] = await db
    .select()
    .from(objetivos)
    .where(and(eq(objetivos.id, id), eq(objetivos.userId, userId)));
  return linha ?? null;
}

// Tudo do ano, no formato do calculos.ts (resumo do ano)
export function lancamentosDoAno(ano: number) {
  return db
    .select({
      data: lancamentos.data,
      tipo: lancamentos.tipo,
      valor: lancamentos.valor,
      subtipoEntrada: lancamentos.subtipoEntrada,
      status: lancamentos.status,
      formaTipo: formasPagamento.tipo,
      categoriaId: lancamentos.categoriaId,
    })
    .from(lancamentos)
    .leftJoin(formasPagamento, eq(lancamentos.formaPagamentoId, formasPagamento.id))
    .where(and(eq(lancamentos.userId, userId), between(lancamentos.data, `${ano}-01-01`, `${ano}-12-31`)));
}

export function listarTodasCategorias() {
  return db
    .select({ id: categorias.id, nome: categorias.nome, icone: categorias.icone, cor: categorias.cor })
    .from(categorias)
    .where(eq(categorias.userId, userId));
}

// Lançamentos do mês com o que os gráficos precisam
export function lancamentosParaGraficos(mes: Mes) {
  const { inicio, fim } = intervaloDoMes(mes);
  return db
    .select({
      data: lancamentos.data,
      tipo: lancamentos.tipo,
      valor: lancamentos.valor,
      subtipoEntrada: lancamentos.subtipoEntrada,
      status: lancamentos.status,
      categoriaId: lancamentos.categoriaId,
      formaTipo: formasPagamento.tipo,
      formaNome: formasPagamento.nome,
    })
    .from(lancamentos)
    .leftJoin(formasPagamento, eq(lancamentos.formaPagamentoId, formasPagamento.id))
    .where(and(eq(lancamentos.userId, userId), between(lancamentos.data, inicio, fim)));
}
