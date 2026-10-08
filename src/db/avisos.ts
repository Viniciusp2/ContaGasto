// Avisos e lembretes (1.7.3, CLAUDE.md 4.16): junta os dados das telas, monta os avisos (regras em lib/avisos.ts)
// e manda pro celular o que ainda não foi (db/push.ts).
import { and, asc, between, desc, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import {
  avisoDeLancar,
  avisoDeResumo,
  avisoDeRitmo,
  avisosDeAssinaturas,
  avisosDeContas,
  avisosDeEmprestimos,
  avisosDeEntradas,
  avisosDeFatura,
  avisosDeLembretes,
  avisosDeMetas,
  avisosDeObjetivos,
  montarNotificacoes,
  ordenarAvisos,
  type Aviso,
  type EntradaPrevista,
  type Ritmo,
  type Vez,
} from "@/lib/avisos";
import { saldoReal, resumoDoMes } from "@/lib/calculos";
import { hojeISO, intervaloDoMes, mesDe, mesParaTexto, somarDias, somarMeses } from "@/lib/datas";
import { subtipoDaCategoria } from "@/lib/entradas";
import type { Repetir } from "@/lib/lembretes";
import { planoDoObjetivo } from "@/lib/objetivos";
import { disponivelParaGastar, planoAteFimDoMes, possoGastarPorDia } from "@/lib/painel";
import { cartaoConfigurado, mediaEstimada, ocorrencia, ocorrenciasNoIntervalo } from "@/lib/recorrencias";
import { db } from ".";
import { lancamentosParaCalculo, listarFormasPagamento, listarObjetivos, listarRecorrencias } from "./consultas";
import { valoresConfirmadosRecentes } from "./gerar-recorrencias";
import { metasDoMes } from "./metas-do-mes";
import { compromissosDoMes, gastoDiaADiaRecente, guardadoNoMes } from "./painel";
import { contasDoMes, contasPendentes, type ContaDoMes } from "./pagamentos";
import { enviarParaAparelhos, listarAparelhos, preferenciasAvisos } from "./push";
import { saldosHoje } from "./saldos";
import { avisosEnviados, emprestimos, lancamentos, lembretes, movimentosObjetivo } from "./schema";
import { USUARIO_PADRAO } from "./usuario-padrao";

const userId = USUARIO_PADRAO.id;

// ---------- Lembretes ----------

export async function listarLembretes() {
  const linhas = await db
    .select()
    .from(lembretes)
    .where(eq(lembretes.userId, userId))
    .orderBy(asc(lembretes.concluido), asc(lembretes.data), desc(lembretes.updatedAt));
  return linhas.map((l) => ({ ...l, repetir: l.repetir as Repetir }));
}

export async function lembretesPendentes() {
  return (await listarLembretes()).filter((l) => !l.concluido);
}

// ---------- Dados ----------

// Próxima vez de cada entrada fixa (salário, VA...), até "ateDias" pra frente. Conta também a de hoje,
// mesmo que já tenha virado lançamento.
export async function proximasEntradas(hoje: string, ateDias = 45): Promise<EntradaPrevista[]> {
  const ontem = somarDias(hoje, -1);
  const limite = somarDias(hoje, ateDias);
  const itens: EntradaPrevista[] = [];
  for (const r of await listarRecorrencias()) {
    if (r.categoriaTipo !== "entrada" || r.categoriaNome === "Empréstimo recebido") continue;
    if (!r.rec.ativa && !r.rec.dataFim) continue; // pausado
    const [o] = ocorrenciasNoIntervalo({ ...r.rec, geradaAte: null }, null, ontem, limite);
    if (!o) continue;
    const variavel = r.rec.tipo === "fixa_variavel";
    const valor = variavel
      ? mediaEstimada(await valoresConfirmadosRecentes(r.rec.id, r.rec.mesesMedia), r.rec.mesesMedia, r.rec.valorEstimado ?? r.rec.valor)
      : r.rec.valor;
    const subtipo = subtipoDaCategoria(r.categoriaNome);
    itens.push({
      chave: `${r.rec.id}-${o.competencia}`,
      descricao: r.rec.descricao,
      valor,
      data: o.data,
      estimado: variavel,
      va: subtipo === "beneficio",
      salario: subtipo === "salario",
    });
  }
  return itens.sort((a, b) => a.data.localeCompare(b.data));
}

// Assinaturas fixas que cobram amanhã (o dia da cobrança, mesmo no cartão, onde o dinheiro só sai na fatura)
async function assinaturasDeAmanha(hoje: string) {
  const amanha = somarDias(hoje, 1);
  const fim = mesDe(amanha);
  const itens = [];
  for (const r of await listarRecorrencias()) {
    if (r.categoriaNome !== "Assinaturas" || r.rec.tipo === "temporaria" || !r.rec.ativa) continue;
    const inicio = mesDe(r.rec.dataInicio);
    const k = (fim.ano - inicio.ano) * 12 + (fim.mes - inicio.mes);
    if (k < 0) continue;
    const cartao = r.formaTipo === "credito" ? { diaFechamento: r.diaFechamento, diaVencimento: r.diaVencimento } : null;
    const o = ocorrencia(r.rec, k, cartao);
    if (o.dataCompra !== amanha || (r.rec.dataFim && o.dataCompra > r.rec.dataFim)) continue;
    itens.push({ chave: `${r.rec.id}-${o.competencia}`, descricao: r.rec.descricao, valor: r.rec.valor, renovaEm: amanha });
  }
  return itens;
}

// Disponível até o fim do mês e ritmo: mesma conta do Início (com saldos dos bancos, 1.6.6; sem, 4.9)
async function ritmoAgora(hoje: string, entradas: EntradaPrevista[]): Promise<Ritmo> {
  const mes = mesDe(hoje);
  const { fim } = intervaloDoMes(mes);
  const [compromissos, bancos, objetivos] = await Promise.all([compromissosDoMes(hoje, mes), saldosHoje(hoje), listarObjetivos()]);
  const faltaPagar = compromissos.reduce((s, c) => s + c.valor, 0);
  const proxima = entradas.find((e) => !e.va && e.data > hoje && e.data <= fim);
  const proximaEntrada = proxima ? { descricao: proxima.descricao, data: proxima.data } : null;
  if (bancos.algumInformado) {
    const plano = planoAteFimDoMes({
      nasContas: bancos.total,
      faltaPagar,
      guardadoObjetivos: objetivos.reduce((s, o) => s + o.saldo, 0),
      gastoDiaADia30Dias: await gastoDiaADiaRecente(hoje),
      hoje,
      mes,
    });
    return { livre: plano.livre, porDia: plano.porDia, acabaNoDia: plano.acabaNoDia, proximaEntrada };
  }
  const [lista, guardado] = await Promise.all([lancamentosParaCalculo(mes), guardadoNoMes(mes)]);
  const livre = disponivelParaGastar(saldoReal(lista), guardado, faltaPagar);
  return { livre, porDia: possoGastarPorDia(livre, hoje, mes).porDia, acabaNoDia: null, proximaEntrada };
}

async function emprestimosComPrazo() {
  const linhas = await db
    .select()
    .from(emprestimos)
    .where(and(eq(emprestimos.userId, userId), eq(emprestimos.quitado, false), isNotNull(emprestimos.prazo)));
  return linhas.map((e) => ({ id: e.id, pessoa: e.pessoa, valor: e.valor, direcao: e.direcao, prazo: e.prazo! }));
}

async function objetivosDoMes(hoje: string) {
  const { inicio, fim } = intervaloDoMes(mesDe(hoje));
  const [lista, movimentos] = await Promise.all([
    listarObjetivos(),
    db
      .select({ objetivoId: movimentosObjetivo.objetivoId, total: sql<number>`sum(${movimentosObjetivo.valor})::int` })
      .from(movimentosObjetivo)
      .where(and(eq(movimentosObjetivo.userId, userId), between(movimentosObjetivo.data, inicio, fim)))
      .groupBy(movimentosObjetivo.objetivoId),
  ]);
  return lista.map((o) => {
    const plano = planoDoObjetivo(o.valorAlvo, o.saldo, hoje, o.dataAlvo);
    return {
      id: o.id,
      nome: o.nome,
      porMes: plano.porMes,
      concluido: plano.concluido,
      guardadoNoMes: movimentos.find((m) => m.objetivoId === o.id)?.total ?? 0,
    };
  });
}

const paraAviso = (c: ContaDoMes) => ({ chave: c.chave, descricao: c.descricao, valor: c.valor, vencimento: c.vencimento, estimado: c.estimado });

// ---------- Avisos de agora ----------

// Tudo que pede atenção hoje (a tela de Avisos e o envio da manhã)
export async function avisosAgora(hoje = hojeISO()): Promise<Aviso[]> {
  const mes = mesDe(hoje);
  const mesTexto = mesParaTexto(mes);
  const dia = Number(hoje.slice(8, 10));
  const [pendentes, metas, emprestimosAbertos, pendentesLembretes, formas, assinaturas, entradas, objetivos] = await Promise.all([
    contasPendentes(hoje, 3),
    metasDoMes(mes),
    emprestimosComPrazo(),
    lembretesPendentes(),
    listarFormasPagamento(),
    assinaturasDeAmanha(hoje),
    proximasEntradas(hoje),
    objetivosDoMes(hoje),
  ]);
  const ritmo = await ritmoAgora(hoje, entradas);
  const cartoes = formas.flatMap((f) =>
    f.tipo === "credito" && cartaoConfigurado(f) ? [{ id: f.id, nome: f.nome, diaFechamento: f.diaFechamento!, diaVencimento: f.diaVencimento! }] : [],
  );
  // Dia de guardar: o dia do salário fixo; sem salário fixo, dia 5
  const temSalario = entradas.some((e) => e.salario);
  const diaDeGuardar = temSalario ? entradas.some((e) => e.salario && e.data === hoje) : dia === 5;

  let resumo = null;
  if (dia <= 3) {
    const anterior = somarMeses(mes, -1);
    const r = resumoDoMes(await lancamentosParaCalculo(anterior));
    resumo = avisoDeResumo({ mes: anterior, entradas: r.entradas, gasto: r.gasto, saldo: r.saldoReal }, hoje);
  }

  return ordenarAvisos([
    ...avisosDeContas(pendentes.map(paraAviso), hoje),
    ...avisosDeEntradas(entradas, hoje),
    ...avisosDeLembretes(pendentesLembretes, hoje),
    ...avisosDeEmprestimos(emprestimosAbertos, hoje),
    ...avisosDeMetas(metas, mesTexto),
    ...[avisoDeRitmo(ritmo, hoje), resumo].filter((a): a is Aviso => a !== null),
    ...avisosDeFatura(cartoes, hoje),
    ...avisosDeAssinaturas(assinaturas, hoje),
    ...avisosDeObjetivos(objetivos, diaDeGuardar, mesTexto),
  ]);
}

// O sino do Início: só o rápido (contas que o Início já buscou, metas, lembretes e empréstimos)
export async function avisosDoSino(hoje: string, pendentes: ContaDoMes[]) {
  const [metas, lista, emprestimosAbertos] = await Promise.all([metasDoMes(mesDe(hoje)), lembretesPendentes(), emprestimosComPrazo()]);
  return [
    ...avisosDeContas(pendentes.map(paraAviso), hoje),
    ...avisosDeMetas(metas, mesParaTexto(mesDe(hoje))),
    ...avisosDeLembretes(lista, hoje),
    ...avisosDeEmprestimos(emprestimosAbertos, hoje),
  ];
}

// Quanto falta pra receber (cada entrada fixa) e pra pagar (contas não pagas que vencem nos próximos dias)
export async function quantoFalta(hoje: string, dias = 30) {
  const limite = somarDias(hoje, dias);
  const mes = mesDe(hoje);
  const [entradas, doMes, doProximo] = await Promise.all([
    proximasEntradas(hoje, dias),
    contasDoMes(mes, hoje),
    limite.slice(0, 7) > mesParaTexto(mes) ? contasDoMes(somarMeses(mes, 1), hoje) : Promise.resolve([]),
  ]);
  const contas = [...doMes, ...doProximo]
    .filter((c) => !c.paga && c.vencimento >= hoje && c.vencimento <= limite)
    .slice(0, 8)
    .map((c) => ({
      chave: c.chave,
      descricao: c.descricao,
      valor: c.valor,
      data: c.vencimento,
      entrada: false,
      detalhe: c.automatico ? "débito automático" : c.estimado ? "estimado" : undefined,
      href: "/pagamentos",
    }));
  return [
    ...entradas.map((e) => ({
      chave: e.chave,
      descricao: e.descricao,
      valor: e.valor,
      data: e.data,
      entrada: true,
      detalhe: e.estimado ? "estimado" : undefined,
      href: "/fixos",
    })),
    ...contas,
  ].sort((a, b) => a.data.localeCompare(b.data) || Number(b.entrada) - Number(a.entrada));
}

// Algo lançado à mão hoje (horário do Brasil)? O que o fixo gera sozinho não conta.
async function lancouHoje(hoje: string) {
  const [linha] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(lancamentos)
    .where(
      and(
        eq(lancamentos.userId, userId),
        isNull(lancamentos.recorrenciaId),
        sql`(${lancamentos.createdAt} at time zone 'America/Sao_Paulo')::date = ${hoje}`,
      ),
    );
  return (linha?.n ?? 0) > 0;
}

// ---------- Envio (agendador) ----------

export async function rodarEnvio(vez: Vez, agora = new Date()) {
  const hoje = hojeISO(agora);
  const aparelhos = await listarAparelhos();
  if (aparelhos.length === 0) return { aparelhos: 0, notificacoes: 0 };

  const preferencias = await preferenciasAvisos();
  const avisos =
    vez === "manha"
      ? await avisosAgora(hoje)
      : [...avisosDeMetas(await metasDoMes(mesDe(hoje)), mesParaTexto(mesDe(hoje))), avisoDeLancar(await lancouHoje(hoje), hoje)].filter(
          (a): a is Aviso => a !== null,
        );
  const chaves = avisos.map((a) => a.chave);
  const ja = chaves.length
    ? await db
        .select({ chave: avisosEnviados.chave })
        .from(avisosEnviados)
        .where(and(eq(avisosEnviados.userId, userId), inArray(avisosEnviados.chave, chaves)))
    : [];

  let notificacoes = 0;
  for (const n of montarNotificacoes(avisos, { preferencias, vez, jaEnviadas: new Set(ja.map((j) => j.chave)) })) {
    // Marca antes de mandar: se o agendador rodar duas vezes juntas, só uma manda
    const marcadas = await db
      .insert(avisosEnviados)
      .values(n.avisos.map((a) => ({ userId, chave: a.chave, tipo: a.tipo, titulo: a.titulo, texto: a.texto })))
      .onConflictDoNothing()
      .returning({ chave: avisosEnviados.chave });
    if (marcadas.length === 0) continue;
    const r = await enviarParaAparelhos({ titulo: n.titulo, corpo: n.corpo, url: n.url, tag: n.tag });
    if (r.enviados > 0) notificacoes++;
    else {
      // Não chegou em nenhum aparelho: desmarca pra tentar de novo na próxima rodada
      await db.delete(avisosEnviados).where(and(eq(avisosEnviados.userId, userId), inArray(avisosEnviados.chave, marcadas.map((m) => m.chave))));
    }
  }

  // Histórico curto: o que tem mais de 90 dias sai
  await db.delete(avisosEnviados).where(and(eq(avisosEnviados.userId, userId), lt(avisosEnviados.createdAt, new Date(agora.getTime() - 90 * 86_400_000))));
  return { aparelhos: aparelhos.length, notificacoes };
}

export function ultimosEnviados(limite = 15) {
  return db
    .select()
    .from(avisosEnviados)
    .where(eq(avisosEnviados.userId, userId))
    .orderBy(desc(avisosEnviados.createdAt))
    .limit(limite);
}
