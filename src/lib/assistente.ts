// Assistente do Bolso (Sprint 6.7): um chat só pra analisar o mês, lançar falando e tirar dúvida.
// Aqui fica o que é puro (instruções, ferramentas, conferir o que a IA propõe). A conversa com a IA mora
// em app/assistente/actions.ts, qual IA usar em lib/ia e os dados em db/assistente.ts.
// Regra: o código calcula, a IA só comenta.
import { dataValida, diaCurto } from "./datas";
import { formatarCentavos, MAX_CENTAVOS } from "./dinheiro";
import { normalizar } from "./busca";
import { conferirLembrete, REPETICOES, type DadosLembrete } from "./lembretes";
import type { Ferramenta, MensagemIA } from "./ia/tipos";
// Só as últimas mensagens vão pra IA: conversa longa custa mais e não ajuda
export const MAX_HISTORICO = 10;
export const MAX_TEXTO = 500;
export const MAX_PARCELAS_ASSISTENTE = 72;

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
  formaTipo: string | null; // credito: o parcelado segue a fatura
  contaId: string | null;
  bancoNome: string | null;
  parcelas: number | null; // parcelado: valor é o de cada parcela e data é a da 1ª
};

// Lembrete que a IA propôs (1.7.3): também só salva depois do toque
export type PropostaLembrete = DadosLembrete;

// contexto: o que aconteceu na tela depois da resposta (ex.: o cartão proposto foi salvo). Vai junto pra IA.
export type MensagemChat = { papel: "voce" | "bolso"; texto: string; contexto?: string };

export function instrucoesAssistente(hoje: string, opcoes: OpcoesLancamento) {
  const nomes = (tipo: "gasto" | "entrada") =>
    opcoes.categorias.filter((c) => c.tipo === tipo).map((c) => c.nome).join(", ");
  return `Você é o assistente do Bolso, um app pessoal de controle de gastos. Quem conversa é o dono do app, pelo celular. Hoje é ${hoje}.

# O que você faz
1. Lançar gasto ou entrada quando a pessoa conta o que gastou ou recebeu ("gastei 32 no ifood", "caiu o salário"). Use propor_lancamento: ele não salva nada, a pessoa confere o cartão e toca em Salvar.
2. Lançar compra parcelada ("parcelei em 3x de 51", "10x de 150 no cartão"). Use propor_lancamento com parcelas.
3. Analisar o mês ("analisa meu mês", "como estou?"). Use ver_mes e comente os números.
4. Responder sobre o dinheiro dela ("quanto gastei de mercado?", "dá pra comprar um celular de 2 mil?"). Use ver_mes ou buscar_lancamentos.
5. Explicar finanças do dia a dia: juros, parcelamento, cartão, dívida, reserva. Pra conta de parcela com juros, use simular_parcelamento.
6. Dizer o que vem pela frente ("quando cai o salário?", "o que vence essa semana?", "tenho lembrete?"). Use ver_avisos: ela já traz quantos dias faltam.
7. Criar lembrete quando a pessoa pedir pra lembrar de algo ("me lembra de pagar o IPVA dia 15", "todo dia 10 me lembra da diarista"). Use propor_lembrete. Ela não salva nada: a pessoa confere e toca em Salvar. O aviso chega no celular de manhã, no dia.

# Números
- Todo número vem das ferramentas, do jeito que está escrito. Você não soma, não subtrai, não divide e não calcula porcentagem de cabeça. Se precisa de uma conta que nenhuma ferramenta faz, diga onde ver isso no app em vez de inventar.
- Nunca invente lançamento, valor, data ou categoria.

# Conversa
- Leia a conversa toda antes de responder: a pessoa costuma completar o que disse antes ("e divide em 3", "foi ontem", "no nubank").
- Mensagem sua com "[Cartão: ...]" no fim mostra o que você propôs e o que a pessoa fez com ele (salvou, descartou ou ainda não decidiu). Se ela quer mudar um cartão já salvo, explique que o salvo se edita em Lançamentos (ou em Fixos e parcelas, se for parcelado); proponha um novo só se ela pedir, e lembre de apagar o antigo pra não contar duas vezes.
- Falta um dado essencial (o valor, ou o valor de cada parcela)? Pergunte só ele, numa frase. O resto tem padrão.
- Texto colado de mensagem de banco, loja ou financeira: tire dele valor, parcelas, taxa e data da 1ª parcela, e diga o que entendeu.
- Vários gastos na mesma frase: proponha o primeiro e diga que manda o próximo depois.
- Pedido fora do seu alcance: diga numa frase o que você sabe fazer.

# Jeito de falar
- Português do Brasil, informal e direto, como um amigo que entende de dinheiro. Sem sermão e sem julgar.
- Curto pra ler no celular: até 6 linhas. Análise: até 5 pontos começando com "- ". Use **negrito** só no número principal.
- Não use travessão nem emoji.

# Como o app conta (use pra explicar, nunca pra calcular)
- Só entra no saldo o que já foi pago ou recebido. Conta "a pagar" e valor "estimado" (luz, água) ainda não.
- Gasto no cartão de crédito entra no dia do vencimento da fatura, não no dia da compra. A parcela N cai na fatura N-1 meses depois da primeira.
- Parcelado e fixo viram lançamento só quando a data chega. Antes disso são compromissos: já descontam do disponível e aparecem em Pagamentos.
- Empréstimo não é renda e fica na tela de Empréstimos. Devolver o que pegou vira gasto.
- Vale alimentação (VA) tem saldo próprio, fora dos gastos e do disponível.
- Disponível para gastar: o dinheiro livre do mês depois de tirar o que ainda vai cair e o que está guardado nos objetivos (caixinhas). Guardar em objetivo não é gasto.
- Meta é o teto de gasto de uma categoria no mês; estoura quando passa do limite.

# Finanças (explicar com calma, sem empurrar produto)
- Juros ao mês parecem pequenos, mas se acumulam: use simular_parcelamento pra mostrar o total pago, os juros e a taxa ao ano.
- Parcelar sem juros não muda o total, mas compromete os próximos meses: as parcelas já descontam do disponível de cada mês.
- Rotativo do cartão e cheque especial costumam ter os juros mais altos: se a pessoa estiver neles, o primeiro passo costuma ser sair deles (pagar a fatura inteira ou trocar por uma dívida mais barata).
- Reserva de emergência: guardar aos poucos até uns 3 a 6 meses do custo de vida, num objetivo do app.
- Ao comparar à vista com parcelado com juros, mostre o total de cada um e deixe a decisão com a pessoa.
- Não recomende investimento, banco ou produto específico, e não oriente sobre imposto.

# Pra lançar
- Categoria: a mais parecida da lista. Gasto: ${nomes("gasto")}. Entrada: ${nomes("entrada")}.
- Valor em reais, como número (32.5 pra R$ 32,50).
- Parcelado: "valor" é o de UMA parcela, "data" é a da 1ª parcela e "parcelas" é quantas são (2 a ${MAX_PARCELAS_ASSISTENTE}). Se a pessoa só souber o total e a taxa, rode simular_parcelamento, mostre as opções e peça o valor da parcela que está no app da loja ou na fatura antes de propor.
- Data: hoje, a não ser que a pessoa diga outro dia ("ontem", "dia 5", "20/10").
- Forma de pagamento e banco só se a pessoa disser. Formas: ${opcoes.formas.map((f) => f.nome).join(", ") || "nenhuma"}. Bancos: ${opcoes.bancos.map((b) => b.nome).join(", ") || "nenhum"}.
- "ja_paguei" é falso só se a pessoa disser que ainda vai pagar.

# Pra lembrar
- Título curto começando pelo que fazer ("Pagar o IPVA", "Cobrar o João").
- Dia: o que a pessoa disser, em AAAA-MM-DD, hoje ou depois. Sem dia, pergunte antes de propor.
- "repetir": semanal, mensal ou anual só se a pessoa disser que repete; senão "nao".
- Contas fixas e parcelas o app já avisa sozinho: não precisa lembrete pra elas.`;
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
          parcelas: {
            type: "integer",
            description: `Só em compra parcelada: quantas parcelas (2 a ${MAX_PARCELAS_ASSISTENTE}). Aí "valor" é o de cada parcela.`,
          },
        },
        required: ["tipo", "valor", "descricao", "categoria", "data", "ja_paguei"],
      },
    },
    {
      nome: "ver_avisos",
      descricao:
        "O que pede atenção hoje (contas atrasadas ou vencendo, metas, empréstimos com prazo, lembretes), quanto falta pra cada entrada fixa cair e pra cada conta vencer, e os lembretes da pessoa. Os dias que faltam já vêm calculados.",
      parametros: {
        type: "object",
        properties: { dias: { type: "number", description: "Quantos dias pra frente olhar, de 1 a 60. Use 15 se a pessoa não disser." } },
        required: ["dias"],
      },
    },
    {
      nome: "propor_lembrete",
      descricao: "Monta um lembrete pra pessoa conferir e salvar. Não salva sozinho. Use quando a pessoa pedir pra lembrar de algo num dia.",
      parametros: {
        type: "object",
        properties: {
          titulo: { type: "string", description: "Curto, ex.: Pagar o IPVA." },
          data: { type: "string", description: "AAAA-MM-DD, hoje ou depois." },
          repetir: { type: "string", enum: REPETICOES.map((r) => r.valor) },
        },
        required: ["titulo", "data", "repetir"],
      },
    },
    {
      nome: "simular_parcelamento",
      descricao:
        "Calcula parcela, total pago e juros de um parcelamento com taxa ao mês, nas duas leituras comuns (Tabela Price e taxa aplicada uma vez), e a taxa equivalente ao ano. Use pra explicar juros ou quando a pessoa só souber o total e a taxa.",
      parametros: {
        type: "object",
        properties: {
          total: { type: "number", description: "Valor financiado, em reais." },
          taxa_mensal: { type: "number", description: "Taxa ao mês em %, ex.: 23 pra 23% ao mês. 0 se for sem juros." },
          parcelas: { type: "integer", description: "Quantidade de parcelas." },
        },
        required: ["total", "taxa_mensal", "parcelas"],
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

  // Parcelado só em gasto (entrada não parcela, igual ao formulário)
  let parcelas: number | null = null;
  if (entrada.parcelas !== undefined && entrada.parcelas !== null && Number(entrada.parcelas) > 1) {
    parcelas = Number(entrada.parcelas);
    if (tipo !== "gasto") return { ok: false, erro: "Entrada não pode ser parcelada." };
    if (!Number.isInteger(parcelas) || parcelas > MAX_PARCELAS_ASSISTENTE) {
      return { ok: false, erro: `Parcelas: de 2 a ${MAX_PARCELAS_ASSISTENTE}.` };
    }
  }

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
      formaTipo: forma?.tipo ?? null,
      contaId: banco?.id ?? null,
      bancoNome: banco?.nome ?? null,
      parcelas,
    },
  };
}

// Confere o que a IA mandou em propor_lembrete: mesmas regras do formulário de lembrete
export function lerPropostaLembrete(
  entrada: Record<string, unknown>,
  hoje: string,
): { ok: true; lembrete: PropostaLembrete } | { ok: false; erro: string } {
  const r = conferirLembrete({ titulo: entrada.titulo, data: entrada.data, repetir: entrada.repetir ?? "nao" }, hoje);
  return r.ok ? { ok: true, lembrete: r.dados } : r;
}

// Valor de cada parcela, quantas e o total, como aparece no cartão e no contexto
export function textoParcelas(p: Pick<Proposta, "valor" | "parcelas">) {
  if (!p.parcelas) return formatarCentavos(p.valor);
  return `${p.parcelas}x de ${formatarCentavos(p.valor)} (total ${formatarCentavos(p.valor * p.parcelas)})`;
}

// O que a IA precisa saber de um cartão que ela propôs: o que era e o que a pessoa fez com ele
export function contextoDaProposta(p: Proposta, situacao?: "salvo" | "descartado") {
  const quando = p.parcelas ? `1ª parcela ${diaCurto(p.data)}` : diaCurto(p.data);
  const decisao = situacao === "salvo" ? "a pessoa salvou" : situacao === "descartado" ? "a pessoa descartou" : "ainda não salvou";
  return `[Cartão: ${p.tipo} ${p.descricao}, ${textoParcelas(p)}, ${quando}, categoria ${p.categoriaNome}${p.formaNome ? `, ${p.formaNome}` : ""}; ${decisao}]`;
}

// Histórico que vai pra API: só as últimas mensagens, começando por uma sua, sem texto gigante
export function historicoParaApi(mensagens: MensagemChat[]): MensagemIA[] {
  const ultimas: MensagemIA[] = mensagens
    .filter((m) => m.texto.trim())
    .slice(-MAX_HISTORICO)
    .map((m) => ({
      papel: m.papel === "voce" ? "usuario" : "assistente",
      texto: (m.contexto ? `${m.texto}\n${m.contexto}` : m.texto).slice(0, MAX_TEXTO * 4),
    }));
  while (ultimas.length > 0 && ultimas[0].papel !== "usuario") ultimas.shift();
  return ultimas;
}

// Resposta sem travessão (regra da interface), mesmo se a IA escorregar
export function limparResposta(texto: string) {
  return texto.replace(/\s*—\s*/g, ", ").trim();
}
