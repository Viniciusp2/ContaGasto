"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { buscarNoMes, opcoesDeLancamento, verMes } from "@/db/assistente";
import { buscarCategoria, buscarConta, buscarFormaPagamento } from "@/db/consultas";
import { lancamentos } from "@/db/schema";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import {
  ferramentasAssistente,
  historicoParaApi,
  instrucoesAssistente,
  lerMesPedido,
  lerProposta,
  limparResposta,
  MAX_TEXTO,
  type MensagemChat,
  type Proposta,
} from "@/lib/assistente";
import { criarProvedor, ErroIA, lerConfigIA, type ChamadaFerramenta, type MensagemIA } from "@/lib/ia";
import { hojeISO } from "@/lib/datas";
import { subtipoDaCategoria } from "@/lib/entradas";
import { dataEfetiva } from "@/lib/recorrencias";
import { validarLancamento } from "@/lib/validar-lancamento";

export type RespostaAssistente = { texto: string; proposta?: Proposta; erro?: boolean };

// Pergunta que precisa de dado: a IA pede a ferramenta, o app responde e ela escreve. 3 voltas bastam.
const MAX_VOLTAS = 3;
const MAX_TOKENS = 1024;

const ERRO_GENERICO = "Não consegui responder agora. Tenta de novo daqui a pouco.";
const ERROS_IA = {
  chave: "A chave da IA não foi aceita. Confere a variável da chave.",
  limite: "Muita pergunta seguida (ou acabou o limite grátis do dia). Espera um pouco e tenta de novo.",
  creditos: "Os créditos da IA acabaram. Dá pra colocar mais no painel do provedor.",
  outro: ERRO_GENERICO,
};

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
            : null;
      return dados
        ? { id: c.id, nome: c.nome, conteudo: JSON.stringify(dados) }
        : { id: c.id, nome: c.nome, conteudo: "Ferramenta desconhecida.", erro: true };
    }),
  );
  return { papel: "ferramenta", resultados };
}

export async function conversar(mensagens: MensagemChat[]): Promise<RespostaAssistente> {
  const lida = lerConfigIA(process.env);
  if (!lida.ok) return { texto: `O assistente ainda não está ligado: ${lida.erro}`, erro: true };

  const historico = historicoParaApi(mensagens);
  const ultima = historico.at(-1);
  if (!ultima || ultima.papel !== "usuario") return { texto: "Manda uma mensagem pra começar.", erro: true };
  if (ultima.texto.length > MAX_TEXTO) return { texto: `Mensagem grande demais. Escreve em até ${MAX_TEXTO} letras.`, erro: true };

  const hoje = hojeISO();
  const opcoes = await opcoesDeLancamento();
  const ia = criarProvedor(lida.config);
  const conversa: MensagemIA[] = [...historico];

  try {
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
      if (resposta.chamadas.length === 0) return { texto: texto || ERRO_GENERICO, erro: !texto };

      // Todas as ferramentas da volta respondem juntas, numa mensagem só
      conversa.push({ papel: "assistente", texto: resposta.texto, chamadas: resposta.chamadas }, await executar(resposta.chamadas, hoje));
    }
    return { texto: "Essa ficou complicada. Tenta perguntar de um jeito mais direto.", erro: true };
  } catch (erro) {
    console.error("[assistente]", erro);
    return { texto: erro instanceof ErroIA ? ERROS_IA[erro.tipo] : ERRO_GENERICO, erro: true };
  }
}

const userId = USUARIO_PADRAO.id;

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
  const resultado = validarLancamento(form);
  if (!resultado.ok) return { ok: false, erro: resultado.erro };
  const d = resultado.dados;

  const categoria = await buscarCategoria(d.categoriaId);
  if (!categoria || !categoria.ativa || categoria.tipo !== d.tipo) return { ok: false, erro: "Essa categoria não serve pra isso." };
  const forma = d.formaPagamentoId ? await buscarFormaPagamento(d.formaPagamentoId) : null;
  if (d.formaPagamentoId && !forma) return { ok: false, erro: "Forma de pagamento inválida." };
  if (forma?.tipo === "beneficio" && d.tipo === "entrada") return { ok: false, erro: "VA recebido vai na categoria Vale alimentação." };
  if (d.contaId && !(await buscarConta(d.contaId))) return { ok: false, erro: "Esse banco não existe mais." };

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
