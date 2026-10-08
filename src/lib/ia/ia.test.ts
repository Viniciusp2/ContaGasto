import { afterEach, describe, expect, it, vi } from "vitest";
import { lerRespostaAnthropic, mensagensAnthropic } from "./anthropic";
import { lerRespostaCompativel, montarPedidoCompativel, provedorCompativel } from "./compativel";
import { descreverIA, descreverReserva, lerConfigEscolhida, lerConfigIA, lerConfigReserva, listarIAs, type ConfigIA } from "./config";
import { ErroIA, tipoDoStatus, type PedidoIA } from "./tipos";

describe("configuração da IA", () => {
  it("sem IA_PROVEDOR usa o Gemini com a chave dele", () => {
    const r = lerConfigIA({ GEMINI_API_KEY: "g-123" });
    expect(r.ok && r.config).toMatchObject({
      nome: "gemini",
      formato: "openai",
      chave: "g-123",
      modelo: "gemini-3.8-flash",
      url: "https://generativelanguage.googleapis.com/v1beta/openai",
    });
  });

  it("troca de provedor e de modelo só pela variável", () => {
    const r = lerConfigIA({ IA_PROVEDOR: "Groq", GROQ_API_KEY: "q", IA_MODELO: "openai/gpt-oss-20b" });
    expect(r.ok && r.config).toMatchObject({ nome: "groq", modelo: "openai/gpt-oss-20b", url: "https://api.groq.com/openai/v1" });
    expect(lerConfigIA({ IA_PROVEDOR: "claude", ANTHROPIC_API_KEY: "a" })).toMatchObject({ ok: true, config: { formato: "anthropic" } });
  });

  it("IA compatível nova: só URL, modelo e chave", () => {
    const r = lerConfigIA({ IA_PROVEDOR: "compativel", IA_URL: "https://minha-ia.com/v1/", IA_MODELO: "modelo-x", IA_CHAVE: "k" });
    expect(r.ok && r.config).toMatchObject({ url: "https://minha-ia.com/v1", modelo: "modelo-x", chave: "k" });
  });

  it("explica o que falta em vez de quebrar", () => {
    expect(lerConfigIA({})).toEqual({ ok: false, erro: "Falta a chave da IA (GEMINI_API_KEY ou IA_CHAVE)." });
    expect(lerConfigIA({ IA_PROVEDOR: "chatgpt5", IA_CHAVE: "k" })).toMatchObject({ ok: false });
    expect(lerConfigIA({ IA_PROVEDOR: "compativel", IA_CHAVE: "k" })).toEqual({ ok: false, erro: "Falta o endereço da IA (IA_URL)." });
  });

  it("descreve a IA ligada pra mostrar na tela", () => {
    expect(descreverIA({ GEMINI_API_KEY: "g" })).toBe("Google Gemini (gemini-3.8-flash)");
    expect(descreverIA({})).toBeNull();
  });

  it("status HTTP vira um erro que a tela explica", () => {
    expect([401, 403, 429, 402, 500].map(tipoDoStatus)).toEqual(["chave", "chave", "limite", "creditos", "outro"]);
  });
});

const pedido: PedidoIA = {
  sistema: "regras",
  maxTokens: 1024,
  ferramentas: [{ nome: "ver_mes", descricao: "números do mês", parametros: { type: "object", properties: {} } }],
  mensagens: [
    { papel: "usuario", texto: "analisa meu mês" },
    {
      papel: "assistente",
      texto: "",
      chamadas: [{ id: "c1", nome: "ver_mes", entrada: { mes: "2026-10" }, bruto: { id: "c1", type: "function", function: { name: "ver_mes", arguments: '{"mes":"2026-10"}' }, extra_content: { google: { thought_signature: "assinatura" } } } }],
    },
    { papel: "ferramenta", resultados: [{ id: "c1", nome: "ver_mes", conteudo: '{"gastos":"R$ 10,00"}' }] },
  ],
};

describe("formato OpenAI (Gemini, Groq, OpenRouter...)", () => {
  const config = lerConfigIA({ GEMINI_API_KEY: "g" });
  const gemini = (config.ok ? config.config : null) as ConfigIA;

  it("monta o pedido com sistema, ferramentas e o campo de tokens do provedor", () => {
    const corpo = montarPedidoCompativel(gemini, pedido);
    expect(corpo).toMatchObject({ model: "gemini-3.8-flash", max_completion_tokens: 1024, reasoning_effort: "low" });
    expect(corpo.messages[0]).toEqual({ role: "system", content: "regras" });
    expect(corpo.tools?.[0]).toEqual({ type: "function", function: { name: "ver_mes", description: "números do mês", parameters: { type: "object", properties: {} } } });
  });

  it("devolve a chamada original (com a assinatura do Gemini) e o resultado como role tool", () => {
    const { messages } = montarPedidoCompativel(gemini, pedido);
    expect(messages[2]).toMatchObject({ role: "assistant", content: null });
    expect((messages[2].tool_calls as { extra_content: unknown }[])[0].extra_content).toEqual({ google: { thought_signature: "assinatura" } });
    expect(messages[3]).toEqual({ role: "tool", tool_call_id: "c1", content: '{"gastos":"R$ 10,00"}' });
  });

  it("a chamada devolvida leva só os campos do padrão (campo a mais, o provedor pode recusar)", () => {
    const comLixo = { ...pedido, mensagens: pedido.mensagens.map((m) => (m.papel === "assistente" ? { ...m, chamadas: m.chamadas!.map((c) => ({ ...c, bruto: { ...(c.bruto as object), index: 0, outro: 1 } })) } : m)) };
    const chamada = (montarPedidoCompativel(gemini, comLixo).messages[2].tool_calls as Record<string, unknown>[])[0];
    expect(Object.keys(chamada).sort()).toEqual(["extra_content", "function", "id", "type"]);
  });

  it("lê texto, chamadas e tokens da resposta", () => {
    const r = lerRespostaCompativel({
      choices: [{ finish_reason: "tool_calls", message: { content: null, tool_calls: [{ id: "", type: "function", function: { name: "ver_mes", arguments: '{"mes":"2026-10"}' } }] } }],
      usage: { prompt_tokens: 900, completion_tokens: 20 },
    });
    expect(r.texto).toBe("");
    expect(r.chamadas).toHaveLength(1);
    expect(r.chamadas[0]).toMatchObject({ id: "chamada_0", nome: "ver_mes", entrada: { mes: "2026-10" } }); // id vazio ganha um
    expect(r.tokens).toEqual({ entrada: 900, saida: 20 });
  });

  it("argumento quebrado não derruba e filtro de segurança vira recusa", () => {
    const r = lerRespostaCompativel({
      choices: [{ finish_reason: "content_filter", message: { content: "", tool_calls: [{ id: "x", function: { name: "ver_mes", arguments: "{quebrado" } }] } }],
    });
    expect(r.chamadas[0].entrada).toEqual({});
    expect(r.recusou).toBe(true);
  });
});

describe("rede do formato OpenAI", () => {
  const config = lerConfigIA({ GEMINI_API_KEY: "g" });
  const gemini = (config.ok ? config.config : null) as ConfigIA;
  const ok = { choices: [{ finish_reason: "stop", message: { content: "oi" } }] };
  const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status });
  afterEach(() => vi.unstubAllGlobals());

  it("IA sobrecarregada (503) tenta de novo uma vez", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(resposta(503, {})).mockResolvedValueOnce(resposta(200, ok));
    vi.stubGlobal("fetch", fetch);
    const r = await provedorCompativel(gemini).conversar(pedido);
    expect(r.texto).toBe("oi");
    expect(fetch).toHaveBeenCalledTimes(2);
  }, 10_000);

  it("pedido recusado (400) não repete e leva o código", async () => {
    const fetch = vi.fn().mockResolvedValue(resposta(400, { error: { message: "Invalid JSON payload" } }));
    vi.stubGlobal("fetch", fetch);
    const erro = await provedorCompativel(gemini).conversar(pedido).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroIA);
    expect(erro).toMatchObject({ tipo: "outro", status: 400 });
    expect(erro.message).toContain("Invalid JSON payload");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("formato Anthropic (Claude)", () => {
  it("chamada vira tool_use e resultado vira tool_result", () => {
    const m = mensagensAnthropic(pedido);
    expect(m[0]).toEqual({ role: "user", content: "analisa meu mês" });
    expect(m[1]).toEqual({ role: "assistant", content: [{ type: "tool_use", id: "c1", name: "ver_mes", input: { mes: "2026-10" } }] });
    expect(m[2]).toEqual({ role: "user", content: [{ type: "tool_result", tool_use_id: "c1", content: '{"gastos":"R$ 10,00"}', is_error: undefined }] });
  });

  it("lê a resposta", () => {
    const r = lerRespostaAnthropic({
      content: [
        { type: "text", text: "Vou ver", citations: null },
        { type: "tool_use", id: "t1", name: "ver_mes", input: { mes: "2026-10" } },
      ],
      stop_reason: "tool_use",
      usage: { input_tokens: 1200, output_tokens: 30 },
    } as never);
    expect(r).toMatchObject({ texto: "Vou ver", recusou: false, tokens: { entrada: 1200, saida: 30 } });
    expect(r.chamadas).toEqual([{ id: "t1", nome: "ver_mes", entrada: { mes: "2026-10" } }]);
  });
});

describe("IA reserva", () => {
  it("Groq de reserva com a chave própria dele", () => {
    const r = lerConfigReserva({ GEMINI_API_KEY: "g", IA_RESERVA: "groq", GROQ_API_KEY: "q" });
    expect(r).toMatchObject({ ok: true, config: { nome: "groq", chave: "q", modelo: "openai/gpt-oss-120b" } });
  });

  it("IA_MODELO, IA_URL e IA_CHAVE são só da principal", () => {
    const env = { GEMINI_API_KEY: "g", IA_RESERVA: "groq", IA_CHAVE: "geral", IA_MODELO: "outro", IA_URL: "http://x" };
    expect(lerConfigReserva(env)).toEqual({ ok: false, erro: "Falta a chave da IA (GROQ_API_KEY)." });
    const r = lerConfigReserva({ ...env, GROQ_API_KEY: "q" });
    expect(r).toMatchObject({ ok: true, config: { chave: "q", modelo: "openai/gpt-oss-120b", url: "https://api.groq.com/openai/v1" } });
  });

  it("sem IA_RESERVA ou igual à principal não tem reserva", () => {
    expect(lerConfigReserva({ GEMINI_API_KEY: "g" })).toBeNull();
    expect(lerConfigReserva({ GEMINI_API_KEY: "g", IA_RESERVA: "gemini" })).toBeNull();
    expect(lerConfigReserva({ GEMINI_API_KEY: "g", IA_RESERVA: "chatgpt" })).toMatchObject({ ok: false });
  });

  it("descreve a reserva pra tela", () => {
    expect(descreverReserva({ GEMINI_API_KEY: "g", IA_RESERVA: "groq", GROQ_API_KEY: "q" })).toBe("Groq (openai/gpt-oss-120b)");
    expect(descreverReserva({ GEMINI_API_KEY: "g" })).toBeNull();
  });
});

describe("escolher a IA na tela", () => {
  const env = { GEMINI_API_KEY: "g", OPENROUTER_API_KEY: "o", IA_MODELO: "gemini-teste" };

  it("lista as quatro, dizendo quais têm chave", () => {
    const lista = listarIAs(env);
    expect(lista.map((i) => [i.nome, i.pronta])).toEqual([
      ["gemini", true],
      ["groq", false],
      ["openrouter", true],
      ["claude", false],
    ]);
    expect(lista[0].descricao).toBe("Google Gemini (gemini-teste)"); // IA_MODELO vale pra principal
    expect(lista[1]).toMatchObject({ descricao: "Groq", motivo: "Falta a chave da IA (GROQ_API_KEY)." });
  });

  it("a escolhida que não é a principal usa só a chave própria e o modelo padrão", () => {
    expect(lerConfigEscolhida(env, "openrouter")).toMatchObject({ ok: true, config: { chave: "o", modelo: "openrouter/free" } });
    expect(lerConfigEscolhida(env, "groq")).toMatchObject({ ok: false });
    expect(lerConfigEscolhida(env, "inventada")).toMatchObject({ ok: false });
  });

  it("principal compatível aparece na lista", () => {
    const lista = listarIAs({ IA_PROVEDOR: "compativel", IA_URL: "https://x/v1", IA_MODELO: "m", IA_CHAVE: "k" });
    expect(lista.at(-1)).toMatchObject({ nome: "compativel", pronta: true, descricao: "IA compatível (m)" });
  });
});

describe("pedido sem ferramentas", () => {
  it("não manda a lista vazia (alguns provedores recusam)", () => {
    const config = lerConfigIA({ GEMINI_API_KEY: "g" });
    const corpo = montarPedidoCompativel((config.ok ? config.config : null) as ConfigIA, { ...pedido, ferramentas: [] });
    expect("tools" in corpo).toBe(false);
  });
});

describe("erro de configuração não repete o valor", () => {
  it("chave colada em IA_RESERVA não aparece na mensagem", () => {
    const chave = "sk-or-v1-0123456789abcdef";
    const r = lerConfigReserva({ GEMINI_API_KEY: "g", IA_RESERVA: chave });
    expect(r).toMatchObject({ ok: false });
    expect(JSON.stringify(r)).not.toContain(chave);
    expect(JSON.stringify(listarIAs({ IA_PROVEDOR: chave }))).not.toContain(chave);
  });
});
