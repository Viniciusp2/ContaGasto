"use server";

import Anthropic from "@anthropic-ai/sdk";
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
  MODELO_ASSISTENTE,
  type MensagemChat,
  type Proposta,
} from "@/lib/assistente";
import { hojeISO } from "@/lib/datas";
import { subtipoDaCategoria } from "@/lib/entradas";
import { dataEfetiva } from "@/lib/recorrencias";
import { validarLancamento } from "@/lib/validar-lancamento";

export type RespostaAssistente = { texto: string; proposta?: Proposta; erro?: boolean };

// Pergunta que precisa de dado: a IA pede a ferramenta, o app responde e ela escreve. 3 voltas bastam.
const MAX_VOLTAS = 3;

const ERRO_GENERICO = "Não consegui responder agora. Tenta de novo daqui a pouco.";

export async function conversar(mensagens: MensagemChat[]): Promise<RespostaAssistente> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { texto: "O assistente ainda não está ligado: falta a chave da IA (ANTHROPIC_API_KEY).", erro: true };
  }
  const historico = historicoParaApi(mensagens);
  const ultima = historico.at(-1);
  if (!ultima || ultima.role !== "user") return { texto: "Manda uma mensagem pra começar.", erro: true };
  if (typeof ultima.content === "string" && ultima.content.length > MAX_TEXTO) {
    return { texto: `Mensagem grande demais. Escreve em até ${MAX_TEXTO} letras.`, erro: true };
  }

  const hoje = hojeISO();
  const opcoes = await opcoesDeLancamento();
  const client = new Anthropic();
  const conversa: Anthropic.MessageParam[] = [...historico];

  try {
    for (let volta = 0; volta < MAX_VOLTAS; volta++) {
      const resposta = await client.messages.create({
        model: MODELO_ASSISTENTE,
        max_tokens: 1024,
        system: instrucoesAssistente(hoje, opcoes),
        tools: ferramentasAssistente(opcoes),
        messages: conversa,
      });
      console.info("[assistente] tokens", resposta.usage.input_tokens, "entrada,", resposta.usage.output_tokens, "saída");
      if (resposta.stop_reason === "refusal") return { texto: "Essa eu não consigo responder.", erro: true };

      const texto = limparResposta(
        resposta.content.map((b) => (b.type === "text" ? b.text : "")).join("\n"),
      );
      const usos = resposta.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");

      // Propor lançamento encerra a volta: a pessoa confere na tela e decide (não precisa outra chamada)
      const pedido = usos.find((u) => u.name === "propor_lancamento");
      if (pedido) {
        const lida = lerProposta(pedido.input as Record<string, unknown>, opcoes, hoje);
        if (!lida.ok) return { texto: lida.erro, erro: true };
        return { texto: texto || "Confere e salva:", proposta: lida.proposta };
      }
      if (resposta.stop_reason !== "tool_use" || usos.length === 0) {
        return { texto: texto || ERRO_GENERICO, erro: !texto };
      }

      // Todas as ferramentas da volta respondem juntas, numa mensagem só
      const resultados = await Promise.all(
        usos.map(async (u): Promise<Anthropic.ToolResultBlockParam> => {
          const entrada = u.input as Record<string, unknown>;
          const mes = lerMesPedido(entrada.mes, hoje);
          const dados =
            u.name === "ver_mes"
              ? await verMes(mes, hoje)
              : u.name === "buscar_lancamentos"
                ? await buscarNoMes(mes, String(entrada.texto ?? ""), hoje)
                : null;
          return dados
            ? { type: "tool_result", tool_use_id: u.id, content: JSON.stringify(dados) }
            : { type: "tool_result", tool_use_id: u.id, content: "Ferramenta desconhecida.", is_error: true };
        }),
      );
      conversa.push({ role: "assistant", content: resposta.content }, { role: "user", content: resultados });
    }
    return { texto: "Essa ficou complicada. Tenta perguntar de um jeito mais direto.", erro: true };
  } catch (erro) {
    if (erro instanceof Anthropic.AuthenticationError) {
      return { texto: "A chave da IA não foi aceita. Confere a ANTHROPIC_API_KEY.", erro: true };
    }
    if (erro instanceof Anthropic.RateLimitError) {
      return { texto: "Muita pergunta seguida. Espera um minutinho e tenta de novo.", erro: true };
    }
    if (erro instanceof Anthropic.APIError && erro.status === 402) {
      return { texto: "Os créditos da IA acabaram. Dá pra colocar mais no painel da Anthropic.", erro: true };
    }
    console.error("[assistente]", erro);
    return { texto: ERRO_GENERICO, erro: true };
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
