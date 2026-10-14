// Dados que o assistente (Sprint 6.7) entrega pra IA. Tudo sai dos mesmos cálculos das telas:
// Início (disponível, previsão), Metas, Gráficos e a lista de lançamentos. Nada é calculado pela IA.
import { and, between, eq } from "drizzle-orm";
import { db } from ".";
import { categorias, contas, formasPagamento, lancamentos } from "./schema";
import { USUARIO_PADRAO } from "./usuario-padrao";
import { lancamentosVAAte, listarCategoriasAtivas, listarContas, listarFormasPagamento, listarObjetivos } from "./consultas";
import { metasDoMes } from "./metas-do-mes";
import { compromissosDoMes, gastoDiaADiaRecente, guardadoNoMes } from "./painel";
import { saldosHoje } from "./saldos";
import { avisosAgora, lembretesPendentes, quantoFalta } from "./avisos";
import { textoQuantoFalta } from "@/lib/avisos";
import { descreverRepeticao } from "@/lib/lembretes";
import { dadosDaAnalise } from "@/lib/analise-ia";
import type { OpcoesLancamento } from "@/lib/assistente";
import { filtrarLancamentos } from "@/lib/busca";
import { contaComoGasto, saldoReal, saldoVA } from "@/lib/calculos";
import { diaCurto, intervaloDoMes, lerMes, somarMeses, type Mes } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";
import { disponivelParaGastar, partesDaPrevisao, planoAteFimDoMes, possoGastarPorDia } from "@/lib/painel";

const userId = USUARIO_PADRAO.id;
const reais = formatarCentavos;

// Lançamentos do mês com o que a análise e a busca precisam
function lancamentosDoMes(mes: Mes) {
  const { inicio, fim } = intervaloDoMes(mes);
  return db
    .select({
      data: lancamentos.data,
      tipo: lancamentos.tipo,
      valor: lancamentos.valor,
      descricao: lancamentos.descricao,
      obs: lancamentos.obs,
      status: lancamentos.status,
      subtipoEntrada: lancamentos.subtipoEntrada,
      recorrenciaId: lancamentos.recorrenciaId,
      categoriaId: lancamentos.categoriaId,
      categoriaNome: categorias.nome,
      formaTipo: formasPagamento.tipo,
      formaNome: formasPagamento.nome,
      contaNome: contas.nome,
    })
    .from(lancamentos)
    .innerJoin(categorias, eq(lancamentos.categoriaId, categorias.id))
    .leftJoin(formasPagamento, eq(lancamentos.formaPagamentoId, formasPagamento.id))
    .leftJoin(contas, eq(lancamentos.contaId, contas.id))
    .where(and(eq(lancamentos.userId, userId), between(lancamentos.data, inicio, fim)));
}

// ver_mes: a análise do mês + o painel de "agora" quando é o mês atual
export async function verMes(mesTexto: string, hoje: string) {
  const mes = lerMes(mesTexto, hoje);
  const anterior = somarMeses(mes, -1);
  const [lista, antes, cats, metas, objetivos, va] = await Promise.all([
    lancamentosDoMes(mes),
    lancamentosDoMes(anterior),
    listarCategoriasAtivas(),
    metasDoMes(mes),
    listarObjetivos(),
    lancamentosVAAte(mes),
  ]);
  const analise = dadosDaAnalise({
    mes,
    hoje,
    lancamentos: lista,
    anteriores: antes,
    nomesCategorias: new Map(cats.map((c) => [c.id, c.nome])),
    metas,
  });

  const extras = {
    valeAlimentacao: reais(saldoVA(va)),
    objetivos: objetivos.map((o) => ({
      nome: o.nome,
      guardado: reais(o.saldo),
      alvo: reais(o.valorAlvo),
      falta: reais(Math.max(0, o.valorAlvo - o.saldo)),
      ate: o.dataAlvo,
    })),
  };
  if (mesTexto !== hoje.slice(0, 7)) return { ...analise, ...extras };

  // Mesma conta do Início: com os saldos dos bancos informados, parte do dinheiro de verdade (1.6.6);
  // sem eles, do que sobrou no mês (4.9)
  const [compromissos, guardado, bancos] = await Promise.all([compromissosDoMes(hoje, mes), guardadoNoMes(mes), saldosHoje(hoje)]);
  const totalCompromissos = compromissos.reduce((s, c) => s + c.valor, 0);
  const contasQueAindaVaoCair = compromissos
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 8)
    .map((c) => ({ dia: diaCurto(c.data), descricao: c.descricao, valor: reais(c.valor), tipo: c.tipo }));

  if (bancos.algumInformado) {
    const guardadoTotal = objetivos.reduce((s, o) => s + o.saldo, 0);
    const plano = planoAteFimDoMes({
      nasContas: bancos.total,
      faltaPagar: totalCompromissos,
      guardadoObjetivos: guardadoTotal,
      gastoDiaADia30Dias: await gastoDiaADiaRecente(hoje),
      hoje,
      mes,
    });
    return {
      ...analise,
      ...extras,
      agora: {
        comoEContado: "nas contas hoje menos o que falta pagar no mês menos o que está guardado nos objetivos",
        nasContasHoje: reais(bancos.total),
        faltaPagarNoMes: reais(totalCompromissos),
        guardadoNosObjetivos: reais(guardadoTotal),
        disponivelParaGastar: reais(plano.livre),
        disponivelNegativo: plano.livre < 0,
        podeGastarPorDia: plano.porDia === null ? "sem folga" : reais(plano.porDia),
        podeGastarPorSemana: plano.porSemana === null ? "sem folga" : reais(plano.porSemana),
        diasQueFaltamContandoHoje: plano.diasRestantes,
        ritmoDoDiaADia: `${reais(plano.ritmoDiario)} por dia (média dos últimos 30 dias, sem contas)`,
        noRitmoDeAgora:
          plano.acabaNoDia === null
            ? `dá até o fim do mês e sobra ${reais(plano.sobraNoFim)}`
            : `o dinheiro acaba por volta do dia ${plano.acabaNoDia}`,
        contasQueAindaVaoCair,
      },
    };
  }

  const disponivel = disponivelParaGastar(saldoReal(lista), guardado, totalCompromissos);
  const porDia = possoGastarPorDia(disponivel, hoje, mes);
  const ateHoje = lista.filter((l) => l.data <= hoje && contaComoGasto(l));
  const previsao = partesDaPrevisao({
    gastoAteHoje: ateHoje.reduce((s, l) => s + l.valor, 0),
    avulsoAteHoje: ateHoje.filter((l) => !l.recorrenciaId).reduce((s, l) => s + l.valor, 0),
    compromissos: totalCompromissos,
    hoje,
    mes,
  });
  return {
    ...analise,
    ...extras,
    agora: {
      comoEContado: "o que sobrou no mês menos o guardado no mês menos o que ainda vai cair",
      disponivelParaGastar: reais(disponivel),
      disponivelNegativo: disponivel < 0,
      podeGastarPorDia: porDia.porDia === null ? "sem folga" : reais(porDia.porDia),
      diasQueFaltamContandoHoje: porDia.diasRestantes,
      guardadoEmObjetivosNoMes: reais(guardado),
      previsaoDeGastoNoMes: reais(previsao.total),
      ritmoDoDiaADia: `${reais(previsao.ritmoDiario)} por dia`,
      aindaVaiCair: reais(totalCompromissos),
      contasQueAindaVaoCair,
    },
  };
}

// buscar_lancamentos: mesma busca da tela de Lançamentos (sem acento, todas as palavras, também pelo valor)
export async function buscarNoMes(mesTexto: string, texto: string, hoje: string) {
  const lista = await lancamentosDoMes(lerMes(mesTexto, hoje));
  const achados = filtrarLancamentos(lista, texto).sort((a, b) => a.data.localeCompare(b.data));
  const gastos = achados.filter(contaComoGasto);
  return {
    encontrados: achados.length,
    totalGasto: reais(gastos.reduce((s, l) => s + l.valor, 0)),
    obs: "totalGasto só soma gasto já pago (sem estimado, a pagar e VA)",
    lancamentos: achados.slice(0, 30).map((l) => ({
      dia: diaCurto(l.data),
      descricao: l.descricao,
      valor: reais(l.valor),
      tipo: l.tipo,
      categoria: l.categoriaNome,
      forma: l.formaNome,
      banco: l.contaNome,
      situacao: l.status === "confirmado" ? "pago" : l.status === "a_pagar" ? "a pagar" : "estimado",
    })),
  };
}

// Categorias, formas e bancos que a IA pode escolher ao propor um lançamento
export async function opcoesDeLancamento(): Promise<OpcoesLancamento> {
  const [cats, formas, bancos] = await Promise.all([listarCategoriasAtivas(), listarFormasPagamento(), listarContas()]);
  return {
    // "Empréstimo recebido" não é lançado aqui (4.6): fica na tela de Empréstimos
    categorias: cats.filter((c) => c.nome !== "Empréstimo recebido").map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo })),
    formas: formas.map((f) => ({ id: f.id, nome: f.nome, tipo: f.tipo })),
    bancos: bancos.map((b) => ({ id: b.id, nome: b.nome })),
  };
}

// ver_avisos (1.7.3): o mesmo da tela de Avisos, com os dias que faltam já calculados
export async function verAvisos(hoje: string, dias: number) {
  const d = Number.isFinite(dias) ? Math.min(60, Math.max(1, Math.round(dias))) : 15;
  const [avisos, falta, lembretes] = await Promise.all([avisosAgora(hoje), quantoFalta(hoje, d), lembretesPendentes()]);
  return {
    hoje,
    pedindoAtencao: avisos.filter((a) => !a.soNoCelular).map((a) => ({ nivel: a.nivel, titulo: a.titulo, detalhe: a.texto })),
    proximosDias: {
      olhando: `${d} dias pra frente`,
      itens: falta.map((i) => ({
        o_que: i.descricao,
        tipo: i.entrada ? "entrada (vai receber)" : "conta (vai pagar)",
        valor: reais(i.valor),
        dia: diaCurto(i.data),
        quando: textoQuantoFalta(i.data, hoje),
        ...(i.detalhe ? { obs: i.detalhe } : {}),
      })),
    },
    lembretes: lembretes.map((l) => ({
      titulo: l.titulo,
      dia: diaCurto(l.data),
      quando: textoQuantoFalta(l.data, hoje),
      repete: descreverRepeticao(l.repetir, l.inicio),
    })),
  };
}
