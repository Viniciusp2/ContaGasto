// Qual IA o assistente usa. Trocar de provedor é só mudar variável de ambiente, sem mexer no código:
//
//   IA_PROVEDOR   gemini (padrão) | groq | openrouter | claude | compativel
//   IA_MODELO     opcional: troca o modelo padrão do provedor
//   IA_URL        opcional: troca o endereço (proxy, outra região, teste local)
//   IA_CHAVE      opcional: chave pra qualquer provedor (senão, a variável própria de cada um)
//   IA_RESERVA    opcional: outra IA (gemini | groq | openrouter | claude) que responde quando a principal
//                 falha (limite grátis do dia, fora do ar, chave recusada). Usa só a chave própria dela.
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

type Lida = { ok: true; config: ConfigIA } | { ok: false; erro: string };

// Monta a configuração de um provedor. "ajustes" liga IA_CHAVE, IA_MODELO e IA_URL (só valem pra principal).
function montarConfig(pedido: string, env: Env, ajustes: boolean, variavel: string): Lida {
  if (!(pedido in PROVEDORES)) {
    return { ok: false, erro: `${variavel} "${pedido}" não existe. Use: ${Object.keys(PROVEDORES).join(", ")}.` };
  }
  const nome = pedido as NomeProvedor;
  const { variavelChave, ...definicao }: DefinicaoProvedor = PROVEDORES[nome];
  const chave = ((ajustes && env.IA_CHAVE) || env[variavelChave] || "").trim();
  const config: ConfigIA = {
    ...definicao,
    nome,
    chave,
    modelo: (ajustes && env.IA_MODELO?.trim()) || definicao.modelo,
    url: (ajustes && env.IA_URL?.trim().replace(/\/+$/, "")) || definicao.url,
  };
  if (!config.chave) return { ok: false, erro: `Falta a chave da IA (${variavelChave}${ajustes ? " ou IA_CHAVE" : ""}).` };
  if (config.formato === "openai" && !config.url) return { ok: false, erro: "Falta o endereço da IA (IA_URL)." };
  if (!config.modelo) return { ok: false, erro: "Falta o modelo da IA (IA_MODELO)." };
  return { ok: true, config };
}

// Lê a configuração das variáveis de ambiente. Devolve o que falta em vez de quebrar,
// pra tela explicar o que cadastrar.
export function lerConfigIA(env: Env): Lida {
  return montarConfig((env.IA_PROVEDOR ?? "").trim().toLowerCase() || PROVEDOR_PADRAO, env, true, "IA_PROVEDOR");
}

// A IA reserva, se tiver uma configurada e diferente da principal. Sem IA_RESERVA, null.
export function lerConfigReserva(env: Env): Lida | null {
  const pedido = (env.IA_RESERVA ?? "").trim().toLowerCase();
  if (!pedido) return null;
  const principal = lerConfigIA(env);
  if (principal.ok && principal.config.nome === pedido) return null;
  return montarConfig(pedido, env, false, "IA_RESERVA");
}

const descrever = (lida: Lida | null) => (lida?.ok ? `${lida.config.rotulo} (${lida.config.modelo})` : null);

// "Google Gemini (gemini-3.8-flash)", pra mostrar na tela qual IA está respondendo
export function descreverIA(env: Env): string | null {
  return descrever(lerConfigIA(env));
}

export function descreverReserva(env: Env): string | null {
  return descrever(lerConfigReserva(env));
}

// Escolher a IA na mão, na tela do Assistente (pra testar e comparar). "auto" = principal + reserva.
export const IAS_ESCOLHIVEIS: NomeProvedor[] = ["gemini", "groq", "openrouter", "claude"];

export type OpcaoIA = { nome: string; descricao: string; pronta: boolean; motivo?: string };

const principalDe = (env: Env) => (env.IA_PROVEDOR ?? "").trim().toLowerCase() || PROVEDOR_PADRAO;

// A IA escolhida, com os ajustes (IA_CHAVE, IA_MODELO, IA_URL) só se ela for a principal
export function lerConfigEscolhida(env: Env, nome: string): Lida {
  return montarConfig(nome, env, nome === principalDe(env), "IA escolhida");
}

// Todas que dá pra escolher, dizendo quais estão prontas (com chave) e o que falta nas outras
export function listarIAs(env: Env): OpcaoIA[] {
  const nomes = [...IAS_ESCOLHIVEIS];
  if (!nomes.includes(principalDe(env) as NomeProvedor) && principalDe(env) in PROVEDORES) nomes.push(principalDe(env) as NomeProvedor);
  return nomes.map((nome) => {
    const lida = lerConfigEscolhida(env, nome);
    return lida.ok
      ? { nome, descricao: `${lida.config.rotulo} (${lida.config.modelo})`, pronta: true }
      : { nome, descricao: PROVEDORES[nome].rotulo, pronta: false, motivo: lida.erro };
  });
}
