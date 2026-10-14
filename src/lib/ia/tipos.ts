// Formato neutro da conversa com a IA. O assistente só conhece estes tipos; cada provedor
// (Anthropic, Gemini, Groq...) traduz de e para o formato dele num adaptador.

export type Ferramenta = {
  nome: string;
  descricao: string;
  parametros: Record<string, unknown>; // JSON Schema do que a ferramenta recebe
};

export type ChamadaFerramenta = {
  id: string;
  nome: string;
  entrada: Record<string, unknown>;
  // A chamada como o provedor mandou. Volta igualzinha na próxima rodada
  // (o Gemini, por exemplo, anexa uma assinatura que precisa voltar junto).
  bruto?: unknown;
};

export type MensagemIA =
  | { papel: "usuario"; texto: string }
  | { papel: "assistente"; texto: string; chamadas?: ChamadaFerramenta[] }
  | { papel: "ferramenta"; resultados: { id: string; nome: string; conteudo: string; erro?: boolean }[] };

export type RespostaIA = {
  texto: string;
  chamadas: ChamadaFerramenta[];
  recusou: boolean; // filtro de segurança do provedor barrou
  tokens: { entrada: number; saida: number };
};

export type PedidoIA = {
  sistema: string;
  mensagens: MensagemIA[];
  ferramentas: Ferramenta[];
  maxTokens: number;
};

export interface ProvedorIA {
  nome: string;
  modelo: string;
  conversar(pedido: PedidoIA): Promise<RespostaIA>;
}

// Erro que a tela sabe explicar, venha de qual provedor vier
export type TipoErroIA = "chave" | "limite" | "creditos" | "outro";

export class ErroIA extends Error {
  constructor(
    public tipo: TipoErroIA,
    mensagem: string,
    public status?: number, // código HTTP, quando a IA respondeu com erro
  ) {
    super(mensagem);
    this.name = "ErroIA";
  }
}

// Status HTTP de qualquer provedor vira um dos tipos acima
export function tipoDoStatus(status: number): TipoErroIA {
  if (status === 401 || status === 403) return "chave";
  if (status === 429) return "limite";
  if (status === 402) return "creditos";
  return "outro";
}
