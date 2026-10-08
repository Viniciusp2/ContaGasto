// Qual IA o assistente usa. Trocar de provedor é só mudar variável de ambiente, sem mexer no código:
//
//   IA_PROVEDOR   gemini (padrão) | groq | openrouter | claude | compativel
//   IA_MODELO     opcional: troca o modelo padrão do provedor
//   IA_URL        opcional: troca o endereço (proxy, outra região, teste local)
//   IA_CHAVE      opcional: chave pra qualquer provedor (senão, a variável própria de cada um)
//
// "compativel" é qualquer IA que fale o formato de chat da OpenAI (/chat/completions): basta
// IA_URL, IA_MODELO e IA_CHAVE. É assim que uma IA nova entra no futuro.

export type Formato = "anthropic" | "openai";

export type DefinicaoProvedor = {
  rotulo: string; // como aparece na tela
  formato: Formato;
  url?: string; // base da API (formato openai)
  modelo: string;
  variavelChave: string;
  campoMaxTokens?: "max_tokens" | "max_completion_tokens";
  extras?: Record<string, unknown>; // parâmetros a mais que vão em todo pedido
};

export const PROVEDORES = {
  // Testes (plano grátis, outubro de 2026). Google AI Studio: o plano grátis pode usar o que é enviado
  // pra melhorar os produtos do Google; pra dado de verdade, prefira um plano pago.
  gemini: {
    rotulo: "Google Gemini",
    formato: "openai",
    url: "https://generativelanguage.googleapis.com/v1beta/openai",
    modelo: "gemini-3.8-flash",
    variavelChave: "GEMINI_API_KEY",
    campoMaxTokens: "max_completion_tokens",
    extras: { reasoning_effort: "low" },
  },
  groq: {
    rotulo: "Groq",
    formato: "openai",
    url: "https://api.groq.com/openai/v1",
    modelo: "openai/gpt-oss-120b",
    variavelChave: "GROQ_API_KEY",
    campoMaxTokens: "max_completion_tokens",
    extras: { reasoning_effort: "low" },
  },
  openrouter: {
    rotulo: "OpenRouter",
    formato: "openai",
    url: "https://openrouter.ai/api/v1",
    // Roteador dos modelos grátis: escolhe um que aceite ferramentas
    modelo: "openrouter/free",
    variavelChave: "OPENROUTER_API_KEY",
    campoMaxTokens: "max_tokens",
  },
  claude: {
    rotulo: "Claude",
    formato: "anthropic",
    modelo: "claude-haiku-4-5", // o mais barato da Anthropic
    variavelChave: "ANTHROPIC_API_KEY",
  },
  compativel: {
    rotulo: "IA compatível",
    formato: "openai",
    modelo: "",
    variavelChave: "IA_CHAVE",
    campoMaxTokens: "max_tokens",
  },
} satisfies Record<string, DefinicaoProvedor>;

export type NomeProvedor = keyof typeof PROVEDORES;
export const PROVEDOR_PADRAO: NomeProvedor = "gemini";

export type ConfigIA = Omit<DefinicaoProvedor, "variavelChave"> & {
  nome: NomeProvedor;
  chave: string;
};

type Env = Record<string, string | undefined>;

// Lê a configuração das variáveis de ambiente. Devolve o que falta em vez de quebrar,
// pra tela explicar o que cadastrar.
export function lerConfigIA(env: Env): { ok: true; config: ConfigIA } | { ok: false; erro: string } {
  const pedido = (env.IA_PROVEDOR ?? "").trim().toLowerCase() || PROVEDOR_PADRAO;
  if (!(pedido in PROVEDORES)) {
    return { ok: false, erro: `IA_PROVEDOR "${pedido}" não existe. Use: ${Object.keys(PROVEDORES).join(", ")}.` };
  }
  const nome = pedido as NomeProvedor;
  const { variavelChave, ...definicao }: DefinicaoProvedor = PROVEDORES[nome];
  const chave = (env.IA_CHAVE || env[variavelChave] || "").trim();
  const config: ConfigIA = {
    ...definicao,
    nome,
    chave,
    modelo: env.IA_MODELO?.trim() || definicao.modelo,
    url: env.IA_URL?.trim().replace(/\/+$/, "") || definicao.url,
  };
  if (!config.chave) return { ok: false, erro: `Falta a chave da IA (${variavelChave} ou IA_CHAVE).` };
  if (config.formato === "openai" && !config.url) return { ok: false, erro: "Falta o endereço da IA (IA_URL)." };
  if (!config.modelo) return { ok: false, erro: "Falta o modelo da IA (IA_MODELO)." };
  return { ok: true, config };
}

// "Google Gemini (gemini-3.8-flash)", pra mostrar na tela qual IA está respondendo
export function descreverIA(env: Env): string | null {
  const lida = lerConfigIA(env);
  return lida.ok ? `${lida.config.rotulo} (${lida.config.modelo})` : null;
}
