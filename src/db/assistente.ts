// Dados que o assistente (Sprint 6.7) entrega pra IA. Tudo sai dos mesmos cálculos das telas:
// Início (disponível, previsão), Metas, Gráficos e a lista de lançamentos. Nada é calculado pela IA.
import { and, between, eq } from "drizzle-orm";
import { db } from ".";
import { categorias, contas, formasPagamento, lancamentos } from "./schema";
import { USUARIO_PADRAO } from "./usuario-padrao";
import { lancamentosVAAte, listarCategoriasAtivas, listarContas, listarFormasPagamento, listarObjetivos } from "./consultas";
import { metasDoMes } from "./metas-do-mes";
import { compromissosDoMes, guardadoNoMes } from "./painel";
import { dadosDaAnalise } from "@/lib/analise-ia";
import type { OpcoesLancamento } from "@/lib/assistente";
import { filtrarLancamentos } from "@/lib/busca";
import { contaComoGasto, saldoReal, saldoVA } from "@/lib/calculos";
import { diaCurto, intervaloDoMes, lerMes, somarMeses, type Mes } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";
import { disponivelParaGastar, partesDaPrevisao, possoGastarPorDia } from "@/lib/painel";

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

  // Mesma conta do cartão "Disponível para gastar" do Início (4.9)
  const [compromissos, guardado] = await Promise.all([compromissosDoMes(hoje, mes), guardadoNoMes(mes)]);
  const totalCompromissos = compromissos.reduce((s, c) => s + c.valor, 0);
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
      disponivelParaGastar: reais(disponivel),
      disponivelNegativo: disponivel < 0,
      podeGastarPorDia: porDia.porDia === null ? "sem folga" : reais(porDia.porDia),
      diasQueFaltamContandoHoje: porDia.diasRestantes,
      guardadoEmObjetivosNoMes: reais(guardado),
      previsaoDeGastoNoMes: reais(previsao.total),
      ritmoDoDiaADia: `${reais(previsao.ritmoDiario)} por dia`,
      aindaVaiCair: reais(totalCompromissos),
      contasQueAindaVaoCair: compromissos
        .sort((a, b) => a.data.localeCompare(b.data))
        .slice(0, 8)
        .map((c) => ({ dia: diaCurto(c.data), descricao: c.descricao, valor: reais(c.valor), tipo: c.tipo })),
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
