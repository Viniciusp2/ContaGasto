// Banco da demonstração: PGlite só na memória, com as migrations aplicadas e dados inventados.
// Tudo é montado a partir de "hoje", então a demo sempre mostra o mês atual cheio de coisa acontecendo.
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { and, eq, lt, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { hojeISO, mesDe, mesParaTexto, somarDias, somarMeses, type Mes } from "@/lib/datas";
import { subtipoDaCategoria } from "@/lib/entradas";
import { dataEfetiva, dataNoMes } from "@/lib/recorrencias";
import type { Banco } from ".";
import { semearBasico } from "./dados-iniciais";
import { gerarRecorrencias } from "./gerar-recorrencias";
import * as schema from "./schema";
import { USUARIO_PADRAO } from "./usuario-padrao";

const {
  categorias,
  contas,
  emprestimos,
  formasPagamento,
  lancamentos,
  lembretes,
  metas,
  movimentosObjetivo,
  objetivos,
  pagamentosFatura,
  recorrencias,
} = schema;

const userId = USUARIO_PADRAO.id;

// Cria o banco e devolve na hora. As consultas esperam a montagem terminar antes de rodar.
export function criarBancoDemo(hoje = hojeISO()): Banco {
  const pg = new PGlite();
  const interno = drizzle({ client: pg, schema });
  const pronto = montar(interno, hoje);
  // Se a montagem falhar, o erro aparece na primeira consulta (e não some num log)
  pronto.catch(() => {});

  const cliente = {
    query: async (...args: Parameters<PGlite["query"]>) => (await pronto, pg.query(...args)),
    exec: async (...args: Parameters<PGlite["exec"]>) => (await pronto, pg.exec(...args)),
    transaction: async <T,>(fn: Parameters<PGlite["transaction"]>[0]) => (await pronto, pg.transaction(fn) as Promise<T>),
  };
  return drizzle({ client: cliente as unknown as PGlite, schema });
}

async function montar(banco: Banco, hoje: string) {
  await migrate(banco, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await semearBasico(banco, { ...USUARIO_PADRAO, nome: "Visitante", email: "visitante@bolso.demo" });
  await semearExemplo(banco, hoje);
}

// Números "aleatórios" que se repetem: a demo é sempre igual pro mesmo dia
function sorteador(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const entre = (r: () => number, min: number, max: number) => Math.round((min + r() * (max - min)) / 10) * 10;

export async function semearExemplo(banco: Banco, hoje: string) {
  const m0 = mesDe(hoje);
  const meses: Mes[] = [-3, -2, -1, 0].map((d) => somarMeses(m0, d));
  const inicio = dataNoMes(meses[0], 1);

  // ---------- Categorias, formas e bancos ----------
  const cats = await banco.select().from(categorias).where(eq(categorias.userId, userId));
  const cat = (nome: string, tipo: "gasto" | "entrada" = "gasto") => {
    const c = cats.find((x) => x.nome === nome && x.tipo === tipo);
    if (!c) throw new Error(`Categoria de exemplo faltando: ${nome}`);
    return c.id;
  };

  // Cartão: fecha dia 25 e vence dia 5 do mês seguinte
  await banco
    .update(formasPagamento)
    .set({ diaFechamento: 25, diaVencimento: 5 })
    .where(and(eq(formasPagamento.userId, userId), eq(formasPagamento.tipo, "credito")));
  const fps = await banco.select().from(formasPagamento).where(eq(formasPagamento.userId, userId));
  const forma = (tipo: string) => fps.find((f) => f.tipo === tipo)!.id;
  const cartao = { diaFechamento: 25, diaVencimento: 5 };

  // Bancos fictícios (selo com sigla e cor; contraste do texto conferido)
  const [principal, carteira, vale] = await banco
    .insert(contas)
    .values([
      { userId, nome: "Conta Principal", sigla: "CP", cor: "#1E3A8A", corTexto: "#FFFFFF", saldoBase: 185000, saldoBaseEm: somarDias(inicio, -1) },
      { userId, nome: "Carteira Digital", sigla: "CD", cor: "#166534", corTexto: "#FFFFFF", saldoBase: 32000, saldoBaseEm: somarDias(inicio, -1) },
      { userId, nome: "Vale Refeição", sigla: "VR", cor: "#9A3412", corTexto: "#FFFFFF" },
    ])
    .returning({ id: contas.id });

  // ---------- Fixos e parcelas (o app transforma em lançamentos sozinho) ----------
  const fixo = (r: Partial<typeof recorrencias.$inferInsert> & Pick<typeof recorrencias.$inferInsert, "descricao" | "valor" | "diaDoMes" | "categoriaId">) => ({
    userId,
    tipo: "fixa" as const,
    dataInicio: dataNoMes(meses[0], r.diaDoMes),
    ...r,
  });
  await banco.insert(recorrencias).values([
    fixo({ descricao: "Salário", valor: 320000, diaDoMes: 5, diaUtil: 5, dataInicio: inicio, categoriaId: cat("Salário", "entrada"), contaId: principal.id }),
    fixo({ descricao: "Vale refeição", valor: 66000, diaDoMes: 1, categoriaId: cat("Vale alimentação", "entrada"), contaId: vale.id }),
    fixo({ descricao: "Aluguel", valor: 115000, diaDoMes: 10, categoriaId: cat("Casa"), formaPagamentoId: forma("pix"), contaId: principal.id, tipoConta: "aluguel" }),
    fixo({ descricao: "Internet", valor: 9990, diaDoMes: 15, categoriaId: cat("Contas"), formaPagamentoId: forma("debito"), contaId: principal.id, tipoConta: "internet", pagamentoAutomatico: true }),
    fixo({ descricao: "Conta de luz", valor: 14500, valorEstimado: 14500, tipo: "fixa_variavel", diaDoMes: 20, categoriaId: cat("Contas"), formaPagamentoId: forma("pix"), contaId: principal.id, tipoConta: "luz" }),
    fixo({ descricao: "Curso online", valor: 29900, diaDoMes: 8, categoriaId: cat("Educação"), formaPagamentoId: forma("boleto"), contaId: principal.id, tipoConta: "escola" }),
    fixo({ descricao: "Streaming de filmes", valor: 3990, diaDoMes: 12, categoriaId: cat("Assinaturas"), formaPagamentoId: forma("credito"), tipoConta: "assinatura" }),
    fixo({ descricao: "Streaming de música", valor: 2190, diaDoMes: 18, categoriaId: cat("Assinaturas"), formaPagamentoId: forma("credito"), tipoConta: "assinatura" }),
    {
      userId,
      tipo: "temporaria" as const,
      descricao: "Celular novo",
      valor: 18990,
      diaDoMes: 8,
      dataInicio: dataNoMes(meses[1], 8),
      totalParcelas: 10,
      categoriaId: cat("Compras"),
      formaPagamentoId: forma("credito"),
    },
  ]);

  // ---------- Gastos do dia a dia (avulsos) ----------
  type Avulso = { dia: number; descricao: string; min: number; max: number; categoria: string; forma: string; conta?: string };
  const rotina: Avulso[] = [
    { dia: 2, descricao: "Mercado do mês", min: 38000, max: 52000, categoria: "Mercado", forma: "debito", conta: principal.id },
    { dia: 3, descricao: "Almoço", min: 2800, max: 4200, categoria: "Comida", forma: "beneficio", conta: vale.id },
    { dia: 4, descricao: "Combustível", min: 15000, max: 21000, categoria: "Transporte", forma: "credito" },
    { dia: 6, descricao: "Padaria", min: 1200, max: 2600, categoria: "Comida", forma: "pix", conta: carteira.id },
    { dia: 7, descricao: "Almoço", min: 2800, max: 4200, categoria: "Comida", forma: "beneficio", conta: vale.id },
    { dia: 9, descricao: "Farmácia", min: 3500, max: 8900, categoria: "Saúde", forma: "debito", conta: principal.id },
    { dia: 11, descricao: "Delivery de pizza", min: 5500, max: 8500, categoria: "Comida", forma: "credito" },
    { dia: 12, descricao: "Mercado com o vale", min: 24000, max: 34000, categoria: "Mercado", forma: "beneficio", conta: vale.id },
    { dia: 23, descricao: "Hortifruti com o vale", min: 9000, max: 15000, categoria: "Mercado", forma: "beneficio", conta: vale.id },
    { dia: 13, descricao: "Feira", min: 6000, max: 11000, categoria: "Mercado", forma: "pix", conta: carteira.id },
    { dia: 14, descricao: "Almoço", min: 2800, max: 4200, categoria: "Comida", forma: "beneficio", conta: vale.id },
    { dia: 16, descricao: "Corrida de aplicativo", min: 1800, max: 3400, categoria: "Transporte", forma: "pix", conta: carteira.id },
    { dia: 17, descricao: "Cinema", min: 5000, max: 9000, categoria: "Lazer", forma: "credito" },
    { dia: 19, descricao: "Mercado", min: 12000, max: 22000, categoria: "Mercado", forma: "debito", conta: principal.id },
    { dia: 21, descricao: "Almoço", min: 2800, max: 4200, categoria: "Comida", forma: "beneficio", conta: vale.id },
    { dia: 22, descricao: "Camiseta", min: 6000, max: 12000, categoria: "Compras", forma: "credito" },
    { dia: 24, descricao: "Combustível", min: 12000, max: 18000, categoria: "Transporte", forma: "credito" },
    { dia: 26, descricao: "Lanche com amigos", min: 3500, max: 7500, categoria: "Lazer", forma: "pix", conta: carteira.id },
    { dia: 28, descricao: "Almoço", min: 2800, max: 4200, categoria: "Comida", forma: "beneficio", conta: vale.id },
  ];

  const linhas: (typeof lancamentos.$inferInsert)[] = [];
  meses.forEach((m, i) => {
    const r = sorteador(m.ano * 100 + m.mes);
    for (const a of rotina) {
      const compra = dataNoMes(m, a.dia);
      if (compra > hoje) continue;
      const credito = a.forma === "credito";
      const data = credito ? dataEfetiva(compra, cartao) : compra;
      linhas.push({
        userId,
        data,
        dataCompra: credito ? compra : null,
        descricao: a.descricao,
        valor: entre(r, a.min, a.max),
        categoriaId: cat(a.categoria),
        formaPagamentoId: forma(a.forma),
        contaId: a.conta ?? null,
        tipo: "gasto",
      });
    }
    // Um freela no mês passado, pra mostrar entrada extra
    if (i === 2) {
      linhas.push({
        userId,
        data: dataNoMes(m, 18),
        descricao: "Freela: site de uma padaria",
        valor: 90000,
        categoriaId: cat("Extra", "entrada"),
        contaId: principal.id,
        tipo: "entrada",
        subtipoEntrada: subtipoDaCategoria("Extra"),
      });
    }
  });
  // Uma conta avulsa ainda por pagar, vencendo daqui a pouco
  linhas.push({
    userId,
    data: somarDias(hoje, 2),
    vencimento: somarDias(hoje, 2),
    descricao: "IPVA (parcela)",
    valor: 21500,
    categoriaId: cat("Transporte"),
    formaPagamentoId: forma("boleto"),
    contaId: principal.id,
    tipo: "gasto",
    status: "a_pagar",
  });
  await banco.insert(lancamentos).values(linhas);

  // Fixos viram lançamentos até hoje, pela mesma regra do app
  await gerarRecorrencias(hoje, banco);

  // Meses passados: tudo pago no dia certo; a luz veio com valores diferentes
  const passados = await banco
    .select()
    .from(lancamentos)
    .where(and(eq(lancamentos.userId, userId), inArray(lancamentos.status, ["a_pagar", "estimado"]), lt(lancamentos.data, dataNoMes(m0, 1))));
  const luz = [13870, 16240, 15110];
  let n = 0;
  for (const l of passados) {
    const variavel = l.status === "estimado";
    await banco
      .update(lancamentos)
      .set({ status: "confirmado", ...(variavel && { valor: luz[n++ % luz.length] }) })
      .where(eq(lancamentos.id, l.id));
  }
  // Mês atual: o que já venceu foi pago, menos o curso (fica atrasado, pra aparecer em Pagamentos)
  const doMes = await banco
    .select()
    .from(lancamentos)
    .where(and(eq(lancamentos.userId, userId), eq(lancamentos.status, "a_pagar")));
  for (const l of doMes) {
    if (l.descricao === "Curso online" || l.descricao === "IPVA (parcela)") continue;
    if (l.data <= hoje) await banco.update(lancamentos).set({ status: "confirmado" }).where(eq(lancamentos.id, l.id));
  }

  // Faturas do cartão que já venceram foram pagas
  await banco.insert(pagamentosFatura).values(
    meses
      .filter((m) => dataNoMes(m, cartao.diaVencimento) <= hoje)
      .map((m) => ({ userId, formaPagamentoId: forma("credito"), competencia: mesParaTexto(m), pagoEm: dataNoMes(m, cartao.diaVencimento) })),
  );

  // ---------- Metas, objetivos, empréstimos e lembretes ----------
  await banco.insert(metas).values([
    { userId, categoriaId: cat("Comida"), limiteMensal: 40000 },
    { userId, categoriaId: cat("Lazer"), limiteMensal: 15000 },
    { userId, categoriaId: cat("Transporte"), limiteMensal: 45000 },
    { userId, categoriaId: cat("Compras"), limiteMensal: 30000 },
  ]);

  const [viagem, reserva] = await banco
    .insert(objetivos)
    .values([
      { userId, nome: "Viagem de fim de ano", icone: "Plane", valorAlvo: 300000, dataAlvo: dataNoMes(somarMeses(m0, 3), 15) },
      { userId, nome: "Reserva de emergência", icone: "Umbrella", valorAlvo: 1000000, dataAlvo: dataNoMes(somarMeses(m0, 12), 28) },
    ])
    .returning({ id: objetivos.id });
  await banco.insert(movimentosObjetivo).values(
    meses
      .slice(0, 3)
      .flatMap((m) => [
        { userId, objetivoId: viagem.id, data: dataNoMes(m, 6), valor: 40000 },
        { userId, objetivoId: reserva.id, data: dataNoMes(m, 6), valor: 25000 },
      ]),
  );

  await banco.insert(emprestimos).values([
    { userId, descricao: "Ajuda com o conserto do carro", pessoa: "Primo Rafael", valor: 50000, direcao: "a_receber", data: dataNoMes(meses[1], 14), prazo: dataNoMes(somarMeses(m0, 1), 10) },
    { userId, descricao: "Ingresso do show", pessoa: "Amiga Júlia", valor: 18000, direcao: "a_pagar", data: dataNoMes(meses[2], 22), prazo: somarDias(hoje, 5) },
  ]);

  await banco.insert(lembretes).values([
    { userId, titulo: "Revisar gastos da semana", inicio: somarDias(hoje, 1), data: somarDias(hoje, 1), repetir: "semanal" },
    { userId, titulo: "Renovar seguro do carro", inicio: somarDias(hoje, 12), data: somarDias(hoje, 12) },
  ]);
}
