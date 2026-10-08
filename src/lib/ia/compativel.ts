// Adaptador pro formato de chat da OpenAI (/chat/completions), que o Gemini, o Groq, o OpenRouter
// e a maioria das IAs falam. Usa fetch puro: nenhum SDK a mais no projeto.
import type { ConfigIA } from "./config";
import { ErroIA, tipoDoStatus, type ChamadaFerramenta, type PedidoIA, type ProvedorIA, type RespostaIA } from "./tipos";

type ChamadaBruta = { id?: string; type?: string; function?: { name?: string; arguments?: string } };

// Pedido no formato OpenAI. Separado da chamada de rede pra dar pra testar.
export function montarPedidoCompativel(config: ConfigIA, pedido: PedidoIA) {
  const mensagens: Record<string, unknown>[] = [{ role: "system", content: pedido.sistema }];
  for (const m of pedido.mensagens) {
    if (m.papel === "usuario") mensagens.push({ role: "user", content: m.texto });
    else if (m.papel === "assistente") {
      mensagens.push({
        role: "assistant",
        content: m.texto || null,
        // Volta a chamada original (com assinatura, se o provedor mandou uma)
        ...(m.chamadas?.length && {
          tool_calls: m.chamadas.map(
            (c) => c.bruto ?? { id: c.id, type: "function", function: { name: c.nome, arguments: JSON.stringify(c.entrada) } },
          ),
        }),
      });
    } else {
      for (const r of m.resultados) mensagens.push({ role: "tool", tool_call_id: r.id, name: r.nome, content: r.conteudo });
    }
  }
  return {
    model: config.modelo,
    messages: mensagens,
    tools: pedido.ferramentas.map((f) => ({
      type: "function",
      function: { name: f.nome, description: f.descricao, parameters: f.parametros },
    })),
    [config.campoMaxTokens ?? "max_tokens"]: pedido.maxTokens,
    ...config.extras,
  };
}

function lerEntrada(argumentos: string | undefined): Record<string, unknown> {
  try {
    const lido = JSON.parse(argumentos || "{}");
    return typeof lido === "object" && lido !== null ? lido : {};
  } catch {
    return {}; // argumento quebrado: a validação do assistente recusa o que faltar
  }
}

// Resposta no formato OpenAI vira o formato neutro
export function lerRespostaCompativel(corpo: unknown): RespostaIA {
  const dados = corpo as {
    choices?: { message?: { content?: string | null; tool_calls?: ChamadaBruta[] }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const escolha = dados.choices?.[0];
  const chamadas: ChamadaFerramenta[] = (escolha?.message?.tool_calls ?? [])
    .filter((c) => c.function?.name)
    .map((c, i) => {
      // Alguns provedores mandam id vazio; a resposta da ferramenta precisa de um pra casar
      const id = c.id || `chamada_${i}`;
      return { id, nome: c.function!.name!, entrada: lerEntrada(c.function!.arguments), bruto: { ...c, id } };
    });
  return {
    texto: escolha?.message?.content ?? "",
    chamadas,
    recusou: escolha?.finish_reason === "content_filter",
    tokens: { entrada: dados.usage?.prompt_tokens ?? 0, saida: dados.usage?.completion_tokens ?? 0 },
  };
}

export function provedorCompativel(config: ConfigIA): ProvedorIA {
  return {
    nome: config.nome,
    modelo: config.modelo,
    async conversar(pedido) {
      let resposta: Response;
      try {
        resposta = await fetch(`${config.url}/chat/completions`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${config.chave}` },
          body: JSON.stringify(montarPedidoCompativel(config, pedido)),
          signal: AbortSignal.timeout(50_000),
        });
      } catch (erro) {
        throw new ErroIA("outro", `Sem resposta da IA: ${(erro as Error).message}`);
      }
      if (!resposta.ok) {
        const detalhe = (await resposta.text().catch(() => "")).slice(0, 300);
        throw new ErroIA(tipoDoStatus(resposta.status), `IA respondeu ${resposta.status}: ${detalhe}`);
      }
      return lerRespostaCompativel(await resposta.json());
    },
  };
}
