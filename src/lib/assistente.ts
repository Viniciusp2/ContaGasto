// Assistente do Bolso (Sprint 6.7): um chat só pra analisar o mês, lançar falando e tirar dúvida.
// Aqui fica o que é puro (instruções, ferramentas, conferir o que a IA propõe). A conversa com a IA mora
// em app/assistente/actions.ts, qual IA usar em lib/ia e os dados em db/assistente.ts.
// Regra: o código calcula, a IA só comenta.
import { dataValida } from "./datas";
import { MAX_CENTAVOS } from "./dinheiro";
import { normalizar } from "./busca";
import type { Ferramenta, MensagemIA } from "./ia/tipos";
// Só as últimas mensagens vão pra IA: conversa longa custa mais e não ajuda
export const MAX_HISTORICO = 10;
export const MAX_TEXTO = 500;

export type Opcao = { id: string; nome: string };
export type OpcoesLancamento = {
  categorias: (Opcao & { tipo: "gasto" | "entrada" })[];
  formas: (Opcao & { tipo: string })[];
  bancos: Opcao[];
};

export type Proposta = {
  tipo: "gasto" | "entrada";
  valor: number; // centavos
  descricao: string;
  data: string;
  pago: boolean;
  categoriaId: string;
  categoriaNome: string;
  formaPagamentoId: string | null;
  formaNome: string | null;
  contaId: string | null;
  bancoNome: string | null;
};

export type MensagemChat = { papel: "voce" | "bolso"; texto: string };

export function instrucoesAssistente(hoje: string, opcoes: OpcoesLancamento) {
  const nomes = (tipo: "gasto" | "entrada") =>
    opcoes.categorias.filter((c) => c.tipo === tipo).map((c) => c.nome).join(", ");
  return `Você é o assistente do Bolso, um app pessoal de controle de gastos. Quem conversa é o dono do app, pelo celular. Hoje é ${hoje}.

Você faz três coisas:
1. Lançar gasto ou entrada quando a pessoa conta o que gastou ou recebeu ("gastei 32 no ifood", "caiu o salário de 4.500"). Use a ferramenta propor_lancamento. Ela não salva nada: a pessoa confere e toca em Salvar.
2. Analisar o mês ("analisa meu mês", "como estou?"). Use ver_mes e comente os números.
3. Responder perguntas sobre o dinheiro dela ("quanto gastei de mercado?", "dá pra comprar um celular de 2 mil?"). Use ver_mes ou buscar_lancamentos.

Regras:
- Números só vêm das ferramentas, do jeito que estão escritos. Não some, não subtraia e não calcule porcentagem: se o número não veio pronto, fale sem ele ou diga que não sabe.
- Nunca invente lançamento, valor ou categoria que a ferramenta não trouxe.
- Português do Brasil, informal e direto, como um amigo que entende de dinheiro. Sem sermão.
- Respostas curtas pra ler no celular: até 6 linhas. Em análise, até 5 pontos começando com "- ".
- Não use travessão (—) nem emoji.
- Como o app conta: só entra no saldo o que já foi pago ou recebido. Conta a pagar e valor estimado ainda não. Empréstimo não é renda. Vale alimentação tem saldo próprio, fora dos gastos.
- Não dê conselho de investimento nem de imposto.
- Se pedirem algo fora disso, diga numa frase o que você sabe fazer.

Pra lançar:
- Escolha a categoria mais parecida da lista. Gasto: ${nomes("gasto")}. Entrada: ${nomes("entrada")}.
- Valor em reais, como número (32.5 pra R$ 32,50). Sem valor, pergunte antes de propor.
- Data: hoje, a não ser que a pessoa diga outro dia ("ontem", "dia 5").
- Forma de pagamento e banco só se a pessoa disser. Formas: ${opcoes.formas.map((f) => f.nome).join(", ") || "nenhuma"}. Bancos: ${opcoes.bancos.map((b) => b.nome).join(", ") || "nenhum"}.
- "ja_paguei" é falso só se a pessoa disser que ainda vai pagar.
- Vários gastos na mesma frase: proponha o primeiro e diga que manda o próximo depois.`;
}

export function ferramentasAssistente(opcoes: OpcoesLancamento): Ferramenta[] {
  const mes = { type: "string", description: "Mês no formato AAAA-MM." } as const;
  return [
    {
      nome: "ver_mes",
      descricao:
        "Números de um mês já calculados pelo app: entradas, gastos, quanto sobrou, categorias comparadas com o mês anterior, maiores gastos, compras pequenas, metas e objetivos. No mês atual também traz o disponível para gastar, quanto dá pra gastar por dia, a previsão do mês e as contas que ainda vão cair.",
      parametros: { type: "object", properties: { mes }, required: ["mes"] },
    },
    {
      nome: "buscar_lancamentos",
      descricao:
        "Procura lançamentos de um mês pela descrição, categoria, forma de pagamento ou valor (ex.: ifood, mercado, 45,90). Traz até 30, com o total já somado.",
      parametros: {
        type: "object",
        properties: { mes, texto: { type: "string", description: "Palavras pra procurar." } },
        required: ["mes", "texto"],
      },
    },
    {
      nome: "propor_lancamento",
      descricao:
        "Monta um lançamento pra pessoa conferir e salvar. Não salva sozinho. Use quando a pessoa contar um gasto ou entrada com valor.",
      parametros: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["gasto", "entrada"] },
          valor: { type: "number", description: "Em reais. 32.5 = R$ 32,50." },
          descricao: { type: "string", description: "Curta, ex.: iFood, Uber, Mercado do mês." },
          categoria: { type: "string", enum: [...new Set(opcoes.categorias.map((c) => c.nome))] },
          data: { type: "string", description: "AAAA-MM-DD." },
          // Lista vazia não pode virar enum (a API recusa), então o campo só aparece quando tem opção
          ...(opcoes.formas.length > 0 && {
            forma: { type: "string", enum: opcoes.formas.map((f) => f.nome), description: "Só se a pessoa disser." },
          }),
          ...(opcoes.bancos.length > 0 && {
            banco: { type: "string", enum: opcoes.bancos.map((b) => b.nome), description: "Só se a pessoa disser." },
          }),
          ja_paguei: { type: "boolean" },
        },
        required: ["tipo", "valor", "descricao", "categoria", "data", "ja_paguei"],
      },
    },
  ];
}

// Mês pedido pela IA. Fora do formato, usa o mês de hoje.
export function lerMesPedido(valor: unknown, hoje: string): string {
  return typeof valor === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor) ? valor : hoje.slice(0, 7);
}

const achar = <T extends Opcao>(lista: T[], nome: unknown) =>
  typeof nome === "string" && nome.trim() ? lista.find((o) => normalizar(o.nome) === normalizar(nome)) : undefined;

// Confere o que a IA mandou em propor_lancamento. O que não bate vira erro, e o resto só fica salvo depois do toque.
export function lerProposta(
  entrada: Record<string, unknown>,
  opcoes: OpcoesLancamento,
  hoje: string,
): { ok: true; proposta: Proposta } | { ok: false; erro: string } {
  const tipo = entrada.tipo;
  if (tipo !== "gasto" && tipo !== "entrada") return { ok: false, erro: "Não entendi se foi gasto ou entrada." };

  const reais = typeof entrada.valor === "string" ? Number(entrada.valor.replace(",", ".")) : Number(entrada.valor);
  const valor = Math.round(reais * 100);
  if (!Number.isFinite(reais) || valor <= 0) return { ok: false, erro: "Faltou o valor." };
  if (valor > MAX_CENTAVOS) return { ok: false, erro: "Esse valor é grande demais." };

  const doTipo = opcoes.categorias.filter((c) => c.tipo === tipo);
  const categoria = achar(doTipo, entrada.categoria) ?? achar(doTipo, "Outros");
  if (!categoria) return { ok: false, erro: "Não achei uma categoria pra isso." };

  // Entrada não tem forma de pagamento; VA só serve pra pagar (4.13)
  const forma = tipo === "gasto" ? achar(opcoes.formas, entrada.forma) ?? null : null;
  const banco = achar(opcoes.bancos, entrada.banco) ?? null;
  const data = typeof entrada.data === "string" && dataValida(entrada.data) ? entrada.data : hoje;
  const descricao = typeof entrada.descricao === "string" ? entrada.descricao.trim().slice(0, 80) : "";

  return {
    ok: true,
    proposta: {
      tipo,
      valor,
      descricao: descricao || categoria.nome,
      data,
      pago: entrada.ja_paguei !== false,
      categoriaId: categoria.id,
      categoriaNome: categoria.nome,
      formaPagamentoId: forma?.id ?? null,
      formaNome: forma?.nome ?? null,
      contaId: banco?.id ?? null,
      bancoNome: banco?.nome ?? null,
    },
  };
}

// Histórico que vai pra API: só as últimas mensagens, começando por uma sua, sem texto gigante
export function historicoParaApi(mensagens: MensagemChat[]): MensagemIA[] {
  const ultimas: MensagemIA[] = mensagens
    .filter((m) => m.texto.trim())
    .slice(-MAX_HISTORICO)
    .map((m) => ({ papel: m.papel === "voce" ? "usuario" : "assistente", texto: m.texto.slice(0, MAX_TEXTO * 4) }));
  while (ultimas.length > 0 && ultimas[0].papel !== "usuario") ultimas.shift();
  return ultimas;
}

// Resposta sem travessão (regra da interface), mesmo se a IA escorregar
export function limparResposta(texto: string) {
  return texto.replace(/\s*—\s*/g, ", ").trim();
}
