// Área Dev (só do Vinícius): o que é puro. Regra de ouro daqui: nunca mostrar nem gravar valor de
// senha, chave ou segredo. Variável aparece só com o nome e se existe.

export type NivelLog = "info" | "aviso" | "erro";
export const NIVEIS: NivelLog[] = ["info", "aviso", "erro"];

type Env = Record<string, string | undefined>;

// As variáveis que o app usa, agrupadas. "obrigatoria" = sem ela algo para.
export const VARIAVEIS = [
  { nome: "DATABASE_URL", grupo: "Banco", dica: "Neon (ou neon_DATABASE_URL / POSTGRES_URL)", alternativas: ["neon_DATABASE_URL", "POSTGRES_URL"] },
  { nome: "IA_PROVEDOR", grupo: "IA", dica: "qual IA responde (padrão: gemini)" },
  { nome: "IA_RESERVA", grupo: "IA", dica: "IA que entra quando a principal falha" },
  { nome: "GEMINI_API_KEY", grupo: "IA", dica: "aistudio.google.com" },
  { nome: "GROQ_API_KEY", grupo: "IA", dica: "console.groq.com" },
  { nome: "OPENROUTER_API_KEY", grupo: "IA", dica: "openrouter.ai" },
  { nome: "ANTHROPIC_API_KEY", grupo: "IA", dica: "platform.claude.com (pago)" },
  { nome: "IA_MODELO", grupo: "IA", dica: "troca o modelo da principal" },
  { nome: "IA_URL", grupo: "IA", dica: "troca o endereço da principal" },
  { nome: "IA_CHAVE", grupo: "IA", dica: "chave da IA compatível" },
  { nome: "BOLSO_SENHA", grupo: "Login", dica: "opcional: a senha mora no banco" },
  { nome: "BOLSO_SEGREDO", grupo: "Login", dica: "opcional: o segredo mora no banco" },
  { nome: "CRON_SECRET", grupo: "Avisos", dica: "agendador das notificações" },
  { nome: "VAPID_PUBLIC_KEY", grupo: "Avisos", dica: "push no celular", alternativas: ["NEXT_PUBLIC_VAPID_PUBLIC_KEY"] },
  { nome: "VAPID_PRIVATE_KEY", grupo: "Avisos", dica: "push no celular" },
] as const;

export type EstadoVariavel = { nome: string; grupo: string; dica: string; definida: boolean; comoNome?: string };

// Só o nome e se existe. Vazio ou só espaço conta como não definida (é o erro mais comum ao colar).
export function estadoVariaveis(env: Env): EstadoVariavel[] {
  return VARIAVEIS.map((v) => {
    const nomes = [v.nome, ...("alternativas" in v ? v.alternativas : [])];
    const achada = nomes.find((n) => (env[n] ?? "").trim() !== "");
    return { nome: v.nome, grupo: v.grupo, dica: v.dica, definida: Boolean(achada), ...(achada && achada !== v.nome && { comoNome: achada }) };
  });
}

// Nome parecido com uma variável conhecida, mas escrito diferente (ex.: "OPENROUTER_KEY", "openrouter_api_key")
const miolo = (nome: string) =>
  nome
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .replace(/(APIKEY|KEY|TOKEN|CHAVE|SECRET)$/, "");

export function nomesParecidos(env: Env): { encontrado: string; talvezSeja: string }[] {
  const conhecidas: string[] = VARIAVEIS.flatMap((v) => [v.nome, ...("alternativas" in v ? v.alternativas : [])]);
  return Object.keys(env)
    .filter((nome) => !conhecidas.includes(nome) && (env[nome] ?? "").trim() !== "")
    .flatMap((nome) => {
      const alvo = conhecidas.find((c) => miolo(c).length >= 4 && miolo(c) === miolo(nome));
      return alvo ? [{ encontrado: nome, talvezSeja: alvo }] : [];
    });
}

// IA_PROVEDOR e IA_RESERVA levam só o nome da IA. Valor diferente (ou uma chave colada ali) vira aviso,
// sem nunca mostrar o valor.
const NOMES_DE_IA = ["gemini", "groq", "openrouter", "claude", "compativel"];
const CARA_DE_CHAVE = /^(sk-|gsk_|AIza|sk-or-|sk-ant-)|^[A-Za-z0-9_\-]{30,}$/;

export function avisosDeValor(env: Env): string[] {
  const avisos: string[] = [];
  for (const nome of ["IA_PROVEDOR", "IA_RESERVA"]) {
    const valor = (env[nome] ?? "").trim();
    if (!valor || NOMES_DE_IA.includes(valor.toLowerCase())) continue;
    avisos.push(
      CARA_DE_CHAVE.test(valor)
        ? `${nome} parece ter uma chave dentro. Ela leva só o nome da IA (ex.: openrouter); a chave vai na variável própria (ex.: OPENROUTER_API_KEY). Troque a chave, porque ela ficou num lugar visível.`
        : `${nome} tem um valor que não é o nome de uma IA. Use só: ${NOMES_DE_IA.join(", ")}.`,
    );
  }
  return avisos;
}

// Detalhe de log: corta texto grande e tira qualquer campo com cara de segredo
const CAMPOS_SECRETOS = /(senha|segredo|secret|chave|key|token|authorization|password)/i;
export function limparDetalhe(detalhe: Record<string, unknown>): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  for (const [campo, valor] of Object.entries(detalhe)) {
    if (CAMPOS_SECRETOS.test(campo)) continue;
    if (typeof valor === "string") saida[campo] = valor.length > 1000 ? `${valor.slice(0, 1000)}...` : valor;
    else if (valor !== undefined) saida[campo] = valor;
  }
  return saida;
}

// Texto pra copiar e colar pro Claude: o que está no ar, o que está configurado e os últimos erros
export function textoDiagnostico({
  versao,
  ambiente,
  banco,
  variaveis,
  parecidos = [],
  avisos = [],
  ias,
  erros,
}: {
  versao: string;
  ambiente: string;
  banco: string;
  variaveis: EstadoVariavel[];
  parecidos?: { encontrado: string; talvezSeja: string }[];
  avisos?: string[];
  ias: { descricao: string; pronta: boolean; motivo?: string }[];
  erros: { em: string; origem: string; mensagem: string; detalhe?: unknown }[];
}) {
  const linhas = [
    "Diagnóstico do Bolso",
    `${versao} | ambiente: ${ambiente} | banco: ${banco}`,
    "",
    "Variáveis (só se existem, sem valor):",
    ...variaveis.map((v) => `- ${v.nome}: ${v.definida ? `sim${v.comoNome ? ` (como ${v.comoNome})` : ""}` : "não"}`),
    ...parecidos.map((p) => `- ATENÇÃO: existe ${p.encontrado}, mas o app procura ${p.talvezSeja}`),
    ...avisos.map((a) => `- ATENÇÃO: ${a}`),
    "",
    "IAs:",
    ...ias.map((ia) => `- ${ia.descricao}: ${ia.pronta ? "pronta" : `não (${ia.motivo ?? "sem chave"})`}`),
    "",
    erros.length ? "Últimos erros:" : "Sem erros recentes.",
    ...erros.map((e) => `- ${e.em} [${e.origem}] ${e.mensagem}${e.detalhe ? ` ${JSON.stringify(e.detalhe).slice(0, 300)}` : ""}`),
  ];
  return linhas.join("\n");
}
