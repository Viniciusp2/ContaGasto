// Adaptador pro Claude, pelo SDK oficial da Anthropic.
import Anthropic from "@anthropic-ai/sdk";
import type { ConfigIA } from "./config";
import { ErroIA, tipoDoStatus, type PedidoIA, type ProvedorIA, type RespostaIA } from "./tipos";

// Mensagens no formato da Anthropic: chamada de ferramenta é bloco tool_use e o resultado volta como tool_result
export function mensagensAnthropic(pedido: PedidoIA): Anthropic.MessageParam[] {
  return pedido.mensagens.map((m): Anthropic.MessageParam => {
    if (m.papel === "usuario") return { role: "user", content: m.texto };
    if (m.papel === "assistente") {
      if (!m.chamadas?.length) return { role: "assistant", content: m.texto };
      return {
        role: "assistant",
        content: [
          ...(m.texto ? [{ type: "text" as const, text: m.texto }] : []),
          ...m.chamadas.map((c) => ({ type: "tool_use" as const, id: c.id, name: c.nome, input: c.entrada })),
        ],
      };
    }
    return {
      role: "user",
      content: m.resultados.map((r) => ({ type: "tool_result" as const, tool_use_id: r.id, content: r.conteudo, is_error: r.erro })),
    };
  });
}

export function lerRespostaAnthropic(resposta: Anthropic.Message): RespostaIA {
  return {
    texto: resposta.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n"),
    chamadas: resposta.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
      .map((b) => ({ id: b.id, nome: b.name, entrada: b.input as Record<string, unknown> })),
    recusou: resposta.stop_reason === "refusal",
    tokens: { entrada: resposta.usage.input_tokens, saida: resposta.usage.output_tokens },
  };
}

export function provedorAnthropic(config: ConfigIA): ProvedorIA {
  const client = new Anthropic({ apiKey: config.chave, ...(config.url && { baseURL: config.url }) });
  return {
    nome: config.nome,
    modelo: config.modelo,
    async conversar(pedido) {
      try {
        const resposta = await client.messages.create({
          model: config.modelo,
          max_tokens: pedido.maxTokens,
          system: pedido.sistema,
          tools: pedido.ferramentas.map((f) => ({
            name: f.nome,
            description: f.descricao,
            input_schema: f.parametros as Anthropic.Tool.InputSchema,
          })),
          messages: mensagensAnthropic(pedido),
        });
        return lerRespostaAnthropic(resposta);
      } catch (erro) {
        if (erro instanceof Anthropic.APIError) throw new ErroIA(tipoDoStatus(erro.status ?? 0), erro.message, erro.status);
        throw new ErroIA("outro", (erro as Error).message);
      }
    },
  };
}
