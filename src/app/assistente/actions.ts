"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { buscarNoMes, opcoesDeLancamento, verAvisos, verMes } from "@/db/assistente";
import { buscarCategoria, buscarConta, buscarFormaPagamento } from "@/db/consultas";
import { gerarRecorrencias } from "@/db/gerar-recorrencias";
import { lancamentos, lembretes, recorrencias } from "@/db/schema";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import {
  ferramentasAssistente,
  historicoParaApi,
  instrucoesAssistente,
  lerMesPedido,
  lerProposta,
  lerPropostaLembrete,
  limparResposta,
  MAX_TEXTO,
  type MensagemChat,
  type Proposta,
  type PropostaLembrete,
} from "@/lib/assistente";
import { conferirLembrete } from "@/lib/lembretes";
import { criarProvedor, ErroIA, lerConfigEscolhida, lerConfigIA, lerConfigReserva, type ChamadaFerramenta, type MensagemIA, type ProvedorIA } from "@/lib/ia";
import { hojeISO } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";
import { simularParcelamento, taxaAnual } from "@/lib/financas";
import { subtipoDaCategoria } from "@/lib/entradas";
import { dataEfetiva } from "@/lib/recorrencias";
import { validarLancamento } from "@/lib/validar-lancamento";

// ia: qual IA respondeu ("Groq (openai/gpt-oss-120b)"). respondidoPor: só quando foi a reserva (a principal falhou).
export type RespostaAssistente = {
  texto: string;
  proposta?: Proposta;
  lembrete?: PropostaLembrete;
  erro?: boolean;
  ia?: string;
  respondidoPor?: string;
};

// Pergunta que precisa de dado: a IA pede a ferramenta, o app responde e ela escreve. 3 voltas bastam.
const MAX_VOLTAS = 3;
// Folga pro raciocínio: no Gemini ele conta dentro do limite de saída
const MAX_TOKENS = 2048;

const ERRO_GENERICO = "Não consegui responder agora. Tenta de novo daqui a pouco.";
const ERROS_IA = {
  chave: "A chave da IA não foi aceita. Confere a variável da chave.",
  limite: "Muita pergunta seguida (ou acabou o limite grátis do dia). Espera um pouco e tenta de novo.",
  creditos: "Os créditos da IA acabaram. Dá pra colocar mais no painel do provedor.",
  outro: ERRO_GENERICO,
};

// simular_parcelamento: a conta é do código; a IA recebe os valores já escritos em reais
function simular(entrada: Record<string, unknown>) {
  const total = Math.round(Number(entrada.total) * 100);
  const taxa = Number(entrada.taxa_mensal);
  const parcelas = Number(entrada.parcelas);
  if (!(total > 0) || !(taxa >= 0) || taxa > 100 || !Number.isInteger(parcelas) || parcelas < 1 || parcelas > 120) {
    return { erro: "Preciso de total maior que zero, taxa ao mês entre 0 e 100 e de 1 a 120 parcelas." };
  }
  const r = simularParcelamento(total, taxa, parcelas);
  const escrever = (x: typeof r.price) => ({
    parcela: formatarCentavos(x.parcela),
    totalPago: formatarCentavos(x.totalPago),
    juros: formatarCentavos(x.juros),
  });
  return {
    financiado: formatarCentavos(total),
    parcelas,
    taxaAoMes: `${taxa}%`,
    taxaAoAno: `${Math.round(taxaAnual(taxa))}%`,
    tabelaPrice: { ...escrever(r.price), comoE: "juros compostos ao mês, parcelas iguais (o mais comum em banco, cartão e financeira)" },
    taxaAplicadaUmaVez: { ...escrever(r.taxaUmaVez), comoE: "a porcentagem aplicada uma vez sobre o total e dividida pelas parcelas" },
    obs: "O valor certo da parcela é o que a loja ou a financeira mostra no cronograma.",
  };
}

// Roda as ferramentas que a IA pediu e devolve os resultados como texto (JSON) pra ela ler
async function executar(chamadas: ChamadaFerramenta[], hoje: string): Promise<MensagemIA> {
  const resultados = await Promise.all(
    chamadas.map(async (c) => {
      const mes = lerMesPedido(c.entrada.mes, hoje);
      const dados =
        c.nome === "ver_mes"
          ? await verMes(mes, hoje)
          : c.nome === "buscar_lancamentos"
            ? await buscarNoMes(mes, String(c.entrada.texto ?? ""), hoje)
            : c.nome === "ver_avisos"
              ? await verAvisos(hoje, Number(c.entrada.dias ?? 15))
            : c.nome === "simular_parcelamento"
              ? simular(c.entrada)
              : null;
      return dados
        ? { id: c.id, nome: c.nome, conteudo: JSON.stringify(dados) }
        : { id: c.id, nome: c.nome, conteudo: "Ferramenta desconhecida.", erro: true };
    }),
  );
  return { papel: "ferramenta", resultados };
}

// Uma pergunta inteira com uma IA: pede, roda as ferramentas e volta, até 3 vezes. Erro da IA sobe (ErroIA).
async function responder(
  ia: ProvedorIA,
  historico: MensagemIA[],
  hoje: string,
  opcoes: Awaited<ReturnType<typeof opcoesDeLancamento>>,
): Promise<RespostaAssistente> {
  const conversa: MensagemIA[] = [...historico];
  for (let volta = 0; volta < MAX_VOLTAS; volta++) {
    const resposta = await ia.conversar({
      sistema: instrucoesAssistente(hoje, opcoes),
      mensagens: conversa,
      ferramentas: ferramentasAssistente(opcoes),
      maxTokens: MAX_TOKENS,
    });
    console.info(`[assistente] ${ia.nome}/${ia.modelo}: ${resposta.tokens.entrada} tokens de entrada, ${resposta.tokens.saida} de saída`);
    if (resposta.recusou) return { texto: "Essa eu não consigo responder.", erro: true };
    const texto = limparResposta(resposta.texto);

    // Propor lançamento encerra a volta: a pessoa confere na tela e decide (não precisa outra chamada)
    const pedido = resposta.chamadas.find((c) => c.nome === "propor_lancamento");
    if (pedido) {
      const proposta = lerProposta(pedido.entrada, opcoes, hoje);
      if (!proposta.ok) return { texto: proposta.erro, erro: true };
      return { texto: texto || "Confere e salva:", proposta: proposta.proposta };
    }
    const pedidoLembrete = resposta.chamadas.find((c) => c.nome === "propor_lembrete");
    if (pedidoLembrete) {
      const r = lerPropostaLembrete(pedidoLembrete.entrada, hoje);
      if (!r.ok) return { texto: r.erro, erro: true };
      return { texto: texto || "Confere e salva o lembrete:", lembrete: r.lembrete };
    }
    if (resposta.chamadas.length === 0) {
      if (!texto) console.error(`[assistente] ${ia.nome} respondeu vazio (${resposta.tokens.saida} tokens de saída)`);
      return { texto: texto || `${ERRO_GENERICO} (resposta vazia)`, erro: !texto };
    }

    // Todas as ferramentas da volta respondem juntas, numa mensagem só
    conversa.push({ papel: "assistente", texto: resposta.texto, chamadas: resposta.chamadas }, await executar(resposta.chamadas, hoje));
  }
  return { texto: "Essa ficou complicada. Tenta perguntar de um jeito mais direto.", erro: true };
}

function mensagemDeErro(erro: unknown) {
  if (!(erro instanceof ErroIA)) return ERRO_GENERICO;
  // O código ajuda a descobrir o motivo (o detalhe completo fica no log do servidor)
  const codigo = erro.tipo === "outro" ? ` (código ${erro.status ?? "sem resposta"})` : "";
  return ERROS_IA[erro.tipo] + codigo;
}

// escolha: "auto" (principal e, se falhar, a reserva) ou o nome de uma IA escolhida na tela (só ela responde)
export async function conversar(mensagens: MensagemChat[], escolha = "auto"): Promise<RespostaAssistente> {
  if (escolha !== "auto") return conversarCom(mensagens, escolha);
  const lida = lerConfigIA(process.env);
  const reserva = lerConfigReserva(process.env);
  // Sem a principal mas com a reserva configurada, a reserva assume sozinha
  if (!lida.ok && !reserva?.ok) return { texto: `O assistente ainda não está ligado: ${lida.ok ? "" : lida.erro}`, erro: true };

  const historico = historicoParaApi(mensagens);
  const ultima = historico.at(-1);
  if (!ultima || ultima.papel !== "usuario") return { texto: "Manda uma mensagem pra começar.", erro: true };
  if (ultima.texto.length > MAX_TEXTO) return { texto: `Mensagem grande demais. Escreve em até ${MAX_TEXTO} letras.`, erro: true };

  const hoje = hojeISO();
  const opcoes = await opcoesDeLancamento();

  let erroPrincipal: unknown = null;
  if (lida.ok) {
    try {
      return { ...(await responder(criarProvedor(lida.config), historico, hoje, opcoes)), ia: `${lida.config.rotulo} (${lida.config.modelo})` };
    } catch (erro) {
      console.error(`[assistente] ${lida.config.nome} falhou${reserva?.ok ? `, tentando a reserva (${reserva.config.nome})` : ""}`, erro);
      erroPrincipal = erro;
    }
  }
  if (!reserva?.ok) return { texto: mensagemDeErro(erroPrincipal), erro: true };

  // A pergunta recomeça do zero na reserva: chamada de uma IA não vai pra outra (cada uma tem o seu jeito)
  try {
    const resposta = await responder(criarProvedor(reserva.config), historico, hoje, opcoes);
    return { ...resposta, ia: `${reserva.config.rotulo} (${reserva.config.modelo})`, respondidoPor: reserva.config.rotulo };
  } catch (erro) {
    console.error(`[assistente] a reserva ${reserva.config.nome} também falhou`, erro);
    return { texto: `${mensagemDeErro(erroPrincipal ?? erro)} A IA reserva também não respondeu.`, erro: true };
  }
}

const userId = USUARIO_PADRAO.id;

// Só a IA escolhida responde, sem reserva: é pra testar e comparar uma de cada vez
async function conversarCom(mensagens: MensagemChat[], nome: string): Promise<RespostaAssistente> {
  const lida = lerConfigEscolhida(process.env, nome);
  if (!lida.ok) return { texto: `Essa IA não está pronta: ${lida.erro}`, erro: true };
  const historico = historicoParaApi(mensagens);
  const ultima = historico.at(-1);
  if (!ultima || ultima.papel !== "usuario") return { texto: "Manda uma mensagem pra começar.", erro: true };
  if (ultima.texto.length > MAX_TEXTO) return { texto: `Mensagem grande demais. Escreve em até ${MAX_TEXTO} letras.`, erro: true };
  const ia = `${lida.config.rotulo} (${lida.config.modelo})`;
  try {
    const resposta = await responder(criarProvedor(lida.config), historico, hojeISO(), await opcoesDeLancamento());
    return { ...resposta, ia };
  } catch (erro) {
    console.error(`[assistente] ${nome} (escolhida) falhou`, erro);
    return { texto: mensagemDeErro(erro), erro: true, ia };
  }
}

// Salva o lançamento que a IA propôs, depois do toque em Salvar. Mesma validação e mesmas regras
// do formulário (crédito segue a fatura, gasto ainda não pago fica a pagar, VA não é entrada).
export async function salvarDoAssistente(p: Proposta): Promise<{ ok: true } | { ok: false; erro: string }> {
  const form = new FormData();
  form.set("tipo", p.tipo);
  form.set("valor", String(p.valor));
  form.set("categoriaId", p.categoriaId);
  form.set("formaPagamentoId", p.formaPagamentoId ?? "");
  form.set("contaId", p.contaId ?? "");
  form.set("data", p.data);
  form.set("descricao", p.descricao);
  form.set("pago", p.pago ? "sim" : "nao");
  if (p.parcelas) {
    form.set("repetir", "temporaria");
    form.set("parcelas", String(p.parcelas));
  }
  const resultado = validarLancamento(form);
  if (!resultado.ok) return { ok: false, erro: resultado.erro };
  const d = resultado.dados;

  const categoria = await buscarCategoria(d.categoriaId);
  if (!categoria || !categoria.ativa || categoria.tipo !== d.tipo) return { ok: false, erro: "Essa categoria não serve pra isso." };
  const forma = d.formaPagamentoId ? await buscarFormaPagamento(d.formaPagamentoId) : null;
  if (d.formaPagamentoId && !forma) return { ok: false, erro: "Forma de pagamento inválida." };
  if (forma?.tipo === "beneficio" && d.tipo === "entrada") return { ok: false, erro: "VA recebido vai na categoria Vale alimentação." };
  if (d.contaId && !(await buscarConta(d.contaId))) return { ok: false, erro: "Esse banco não existe mais." };

  // Parcelado vira recorrência temporária, igual ao formulário: o gerador cria cada parcela quando a data chega
  if (d.repetir === "temporaria") {
    await db.insert(recorrencias).values({
      userId,
      tipo: "temporaria",
      descricao: d.descricao || categoria.nome,
      valor: d.valor,
      diaDoMes: Number(d.data.slice(8, 10)),
      diaUtil: null,
      sabadoUtil: d.sabadoUtil,
      categoriaId: d.categoriaId,
      formaPagamentoId: d.formaPagamentoId,
      totalParcelas: d.parcelas,
      dataInicio: d.data,
      diaVencimento: null,
      valorEstimado: null,
      tipoConta: null,
      pagamentoAutomatico: false,
      contaId: d.contaId,
    });
    await gerarRecorrencias();
    revalidatePath("/", "layout");
    return { ok: true };
  }

  const cartao = forma?.tipo === "credito" ? forma : null;
  const aPagar = d.tipo === "gasto" && !d.pago && !cartao && forma?.tipo !== "beneficio";
  await db.insert(lancamentos).values({
    userId,
    data: d.tipo === "gasto" ? dataEfetiva(d.data, cartao) : d.data,
    dataCompra: d.data,
    descricao: d.descricao || categoria.nome,
    valor: d.valor,
    categoriaId: d.categoriaId,
    formaPagamentoId: d.formaPagamentoId,
    contaId: d.contaId,
    tipo: d.tipo,
    subtipoEntrada: d.tipo === "entrada" ? subtipoDaCategoria(categoria.nome) : null,
    obs: null,
    status: aPagar ? "a_pagar" : "confirmado",
    vencimento: aPagar ? d.data : null,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

// Salva o lembrete que a IA propôs (1.7.3), depois do toque em Salvar. Mesma conferência do formulário.
export async function salvarLembreteDoAssistente(p: PropostaLembrete): Promise<{ ok: true } | { ok: false; erro: string }> {
  const r = conferirLembrete(p, hojeISO());
  if (!r.ok) return r;
  await db.insert(lembretes).values({ userId, ...r.dados, inicio: r.dados.data, origem: "assistente" });
  revalidatePath("/", "layout");
  return { ok: true };
}
