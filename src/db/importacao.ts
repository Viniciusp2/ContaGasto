// Importação de lançamentos (ex.: extrato do banco). Tudo numa transação: ou entra tudo, ou nada.
import { and, between, eq, inArray, sql } from "drizzle-orm";
import {
  conciliar,
  copiasAMais,
  manuaisDuplicados,
  veioDeExtrato,
  type Existente,
  type LinhaImportacao,
} from "@/lib/importacao";
import { subtipoDaCategoria } from "@/lib/entradas";
import { seloDoBanco } from "@/lib/bancos";
import { db } from ".";
import { categorias, contas, formasPagamento, lancamentos } from "./schema";
import { USUARIO_PADRAO } from "./usuario-padrao";

const userId = USUARIO_PADRAO.id;
// Uma importação por vez: a segunda espera a primeira terminar e já enxerga o que ela gravou
// (sem isso, dois toques em "Importar" gravavam tudo em dobro)
const TRAVA_IMPORTACAO = 710_701;

const desloca = (data: string, dias: number) =>
  new Date(Date.UTC(Number(data.slice(0, 4)), Number(data.slice(5, 7)) - 1, Number(data.slice(8, 10)) + dias)).toISOString().slice(0, 10);

export async function importarLinhas(linhas: LinhaImportacao[]) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${TRAVA_IMPORTACAO})`);

    const cats = await tx.select().from(categorias).where(eq(categorias.userId, userId));
    const formas = await tx.select().from(formasPagamento).where(eq(formasPagamento.userId, userId));
    const achaCategoria = (nome: string, tipo: "gasto" | "entrada") =>
      cats.find((c) => c.tipo === tipo && c.nome.toLowerCase() === nome.toLowerCase()) ??
      cats.find((c) => c.tipo === tipo && c.nome === "Outros")!;
    // Banco novo é criado com o selo dele (sigla e cor)
    const listaContas = await tx.select().from(contas).where(eq(contas.userId, userId));
    for (const nome of new Set(linhas.map((l) => l.conta).filter((c): c is string => Boolean(c)))) {
      if (listaContas.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) continue;
      const [nova] = await tx.insert(contas).values({ userId, nome, ...seloDoBanco(nome) }).returning();
      listaContas.push(nova);
    }
    const achaConta = (nome: string | null) => (nome ? (listaContas.find((c) => c.nome.toLowerCase() === nome.toLowerCase()) ?? null) : null);
    const achaForma = (nome: string | null) => (nome ? (formas.find((f) => f.nome.toLowerCase() === nome.toLowerCase()) ?? null) : null);

    // O que já existe no período (com folga pra contas a pagar atrasadas), pra conciliar em vez de duplicar
    const datas = linhas.map((l) => l.data).sort();
    const linhasExistentes = await tx
      .select({
        id: lancamentos.id,
        data: lancamentos.data,
        vencimento: lancamentos.vencimento,
        valor: lancamentos.valor,
        tipo: lancamentos.tipo,
        descricao: lancamentos.descricao,
        status: lancamentos.status,
        obs: lancamentos.obs,
        contaId: lancamentos.contaId,
        formaPagamentoId: lancamentos.formaPagamentoId,
        categoriaNome: categorias.nome,
        contaNome: contas.nome,
        criadoEm: lancamentos.createdAt,
      })
      .from(lancamentos)
      .innerJoin(categorias, eq(lancamentos.categoriaId, categorias.id))
      .leftJoin(contas, eq(lancamentos.contaId, contas.id))
      .where(and(eq(lancamentos.userId, userId), between(lancamentos.data, desloca(datas[0], -45), desloca(datas.at(-1)!, 45))));

    // Cópias a mais de uma importação que rodou em dobro: o arquivo diz quantos de cada devem existir
    // "Do arquivo" = observação de extrato ou exatamente a observação de uma linha dele (ex.: saldo anterior do VA)
    const obsDoArquivo = new Set(linhas.map((l) => l.obs).filter(Boolean));
    const apagar = copiasAMais(
      linhas,
      linhasExistentes.filter((e) => veioDeExtrato(e.obs) || (e.obs !== null && obsDoArquivo.has(e.obs))),
    );
    if (apagar.length > 0) await tx.delete(lancamentos).where(and(eq(lancamentos.userId, userId), inArray(lancamentos.id, apagar)));
    const restantes = linhasExistentes.filter((e) => !apagar.includes(e.id));

    const existentes: Existente[] = restantes.map((e) => ({
      ...e,
      descricaoGenerica: e.descricao.trim().toLowerCase() === e.categoriaNome.toLowerCase(),
    }));
    const porId = new Map(restantes.map((e) => [e.id, e]));
    const { novos, repetidos, completar } = conciliar(linhas, existentes);

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
    for (let i = 0; i < valores.length; i += 500) await tx.insert(lancamentos).values(valores.slice(i, i + 500));

    // O seu lançamento fica (data, valor, categoria); ganha banco, forma, observação e, se estava em branco, a descrição.
    // Conta a pagar que o extrato mostra paga vira paga, no dia do banco.
    for (const c of completar) {
      const e = porId.get(c.id)!;
      const obs = !e.obs ? c.linha.obs : c.linha.obs && !e.obs.includes(c.linha.obs) ? `${e.obs} | ${c.linha.obs}` : e.obs;
      await tx
        .update(lancamentos)
        .set({
          contaId: e.contaId ?? achaConta(c.linha.conta)?.id ?? null,
          formaPagamentoId: e.formaPagamentoId ?? achaForma(c.linha.forma)?.id ?? null,
          obs,
          ...(c.trocarDescricao ? { descricao: c.linha.descricao } : {}),
          ...(c.pagar ? { status: "confirmado" as const, data: c.linha.data, vencimento: e.vencimento ?? e.data } : {}),
        })
        .where(eq(lancamentos.id, c.id));
    }

    const meses = [...new Set(novos.map((l) => l.data.slice(0, 7)))].sort().map((m) => `${m.slice(5)}/${m.slice(0, 4)}`);
    return {
      importados: novos.length,
      repetidos,
      completados: completar.length,
      pagas: completar.filter((c) => c.pagar).length,
      copiasApagadas: apagar.length,
      meses,
    };
  });
}

// Seus lançamentos (à mão ou de fixo) que têm um gêmeo vindo do extrato. Só procura, não apaga.
export async function procurarManuaisDuplicados() {
  const todos = await db
    .select({
      id: lancamentos.id,
      data: lancamentos.data,
      valor: lancamentos.valor,
      tipo: lancamentos.tipo,
      descricao: lancamentos.descricao,
      obs: lancamentos.obs,
      contaNome: contas.nome,
    })
    .from(lancamentos)
    .leftJoin(contas, eq(lancamentos.contaId, contas.id))
    .where(eq(lancamentos.userId, userId));
  const doExtrato = todos.filter((l) => veioDeExtrato(l.obs));
  const manuais = todos.filter((l) => !veioDeExtrato(l.obs) && l.contaNome === null);
  return manuaisDuplicados(manuais, doExtrato).map(({ manual, extrato }) => ({
    manual,
    extrato: { ...extrato, contaNome: todos.find((t) => t.id === extrato.id)?.contaNome ?? null },
  }));
}

// Apaga só os ids que ainda são manuais com gêmeo no extrato (confere de novo na hora de apagar)
export async function apagarManuaisDuplicados(ids: string[]) {
  const validos = new Set((await procurarManuaisDuplicados()).map((p) => p.manual.id));
  const apagar = ids.filter((id) => validos.has(id));
  if (apagar.length > 0) await db.delete(lancamentos).where(and(eq(lancamentos.userId, userId), inArray(lancamentos.id, apagar)));
  return apagar.length;
}
