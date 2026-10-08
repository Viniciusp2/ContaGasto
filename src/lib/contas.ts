// Pagamentos do mês (Sprint 6.1): as contas que você tem que pagar, pagas ou não.
import { diasAtePrazo } from "./validar-emprestimo";

// Tipo da conta, pra saber de cara se é luz, água, cartão... (ícone lucide, sem emoji)
export const TIPOS_CONTA = [
  { valor: "aluguel", rotulo: "Aluguel", icone: "House" },
  { valor: "condominio", rotulo: "Condomínio", icone: "Building2" },
  { valor: "luz", rotulo: "Luz", icone: "Lightbulb" },
  { valor: "agua", rotulo: "Água", icone: "Droplet" },
  { valor: "gas", rotulo: "Gás", icone: "Flame" },
  { valor: "internet", rotulo: "Internet", icone: "Wifi" },
  { valor: "telefone", rotulo: "Telefone", icone: "Smartphone" },
  { valor: "cartao", rotulo: "Cartão", icone: "CreditCard" },
  { valor: "financiamento", rotulo: "Financiamento", icone: "Car" },
  { valor: "emprestimo", rotulo: "Empréstimo", icone: "HandCoins" },
  { valor: "escola", rotulo: "Escola", icone: "GraduationCap" },
  { valor: "saude", rotulo: "Plano de saúde", icone: "HeartPulse" },
  { valor: "seguro", rotulo: "Seguro", icone: "ShieldCheck" },
  { valor: "assinatura", rotulo: "Assinatura", icone: "Tv" },
  { valor: "imposto", rotulo: "Imposto", icone: "Landmark" },
  { valor: "outra", rotulo: "Outra", icone: "Receipt" },
] as const;

export type TipoConta = (typeof TIPOS_CONTA)[number]["valor"];

export function tipoContaValido(valor: string): valor is TipoConta {
  return TIPOS_CONTA.some((t) => t.valor === valor);
}

export function dadosTipoConta(valor: string | null | undefined) {
  return TIPOS_CONTA.find((t) => t.valor === valor) ?? null;
}

export type StatusLancamento = "estimado" | "a_pagar" | "confirmado";

// Em que situação um lançamento gerado por fixo nasce:
// - valor que muda (luz, água): estimado, até você confirmar quanto veio (4.8)
// - gasto que você paga na mão: a pagar, até marcar "Paguei"
// - crédito (já segue a fatura), VA, débito automático e entradas: confirmado direto
export function statusAoGerar(r: {
  variavel: boolean;
  tipo: "gasto" | "entrada";
  formaTipo: string | null;
  automatico: boolean;
}): StatusLancamento {
  if (r.variavel) return "estimado";
  if (r.tipo !== "gasto" || r.automatico) return "confirmado";
  if (r.formaTipo === "credito" || r.formaTipo === "beneficio") return "confirmado";
  return "a_pagar";
}

export type Situacao = "paga" | "atrasada" | "vence_hoje" | "a_pagar";

export function situacaoConta(paga: boolean, vencimento: string, hoje: string): Situacao {
  if (paga) return "paga";
  if (vencimento < hoje) return "atrasada";
  if (vencimento === hoje) return "vence_hoje";
  return "a_pagar";
}

// "vence hoje", "vence amanhã", "vence em 5 dias", "atrasada 3 dias"
export function textoVencimento(vencimento: string, hoje: string): string {
  const dias = diasAtePrazo(vencimento, hoje);
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  if (dias > 1) return `vence em ${dias} dias`;
  if (dias === -1) return "atrasada 1 dia";
  return `atrasada ${-dias} dias`;
}

export function resumoPagamentos(contas: { valor: number; paga: boolean }[]) {
  const total = contas.reduce((s, c) => s + c.valor, 0);
  const pago = contas.filter((c) => c.paga).reduce((s, c) => s + c.valor, 0);
  return { total, pago, falta: total - pago, quantas: contas.length, pagas: contas.filter((c) => c.paga).length };
}

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// "mar/2027"
export function mesCurto(dataISO: string): string {
  return `${MESES_CURTOS[Number(dataISO.slice(5, 7)) - 1]}/${dataISO.slice(0, 4)}`;
}

// Quanto tempo a conta ainda dura: "parcela 4/10, termina em mar/2027", "até dez/2026" ou "todo mês"
export function duracaoConta(r: {
  parcela: number | null;
  totalParcelas: number | null;
  ultimaData: string | null; // data da última parcela, ou o fim do fixo
  temporaria: boolean;
}): string {
  if (r.temporaria && r.parcela && r.totalParcelas) {
    const base = `parcela ${r.parcela}/${r.totalParcelas}`;
    if (r.parcela === r.totalParcelas) return `${base}, a última`;
    return r.ultimaData ? `${base}, termina em ${mesCurto(r.ultimaData)}` : base;
  }
  return r.ultimaData ? `até ${mesCurto(r.ultimaData)}` : "todo mês";
}

// O que conta como "conta do mês" em Pagamentos (revisto em 07/10/2026): além dos fixos e do que está a pagar,
// os gastos soltos que são conta de verdade (vieram do extrato ou foram lançados à mão). Compra do dia a dia fica fora.
export const CATEGORIAS_DE_CONTA = ["Contas", "Educação", "Assinaturas", "Pagamento de empréstimo"];

export function ehContaDoMes(l: {
  recorrenciaId: string | null;
  status: string;
  categoriaNome: string;
  formaTipo: string | null;
  descricao: string;
}) {
  if (l.recorrenciaId || l.status !== "confirmado") return true;
  if (CATEGORIAS_DE_CONTA.includes(l.categoriaNome)) return true;
  if (l.formaTipo === "boleto") return true;
  return /aluguel/i.test(l.descricao);
}

// Urgência e prioridade (1.10.3, pedido do Vinícius): o que pagar primeiro.
// Nível pelo prazo; dentro do nível, pesa o que acontece se atrasar.
export type NivelUrgencia = "urgente" | "logo" | "calma" | "negociando";
export const ORDEM_URGENCIA: NivelUrgencia[] = ["urgente", "logo", "calma", "negociando"];
export const ROTULO_URGENCIA: Record<NivelUrgencia, string> = {
  urgente: "Urgente",
  logo: "Logo",
  calma: "Com calma",
  negociando: "Negociando",
};

// Quanto pesa atrasar cada tipo de conta (maior = pagar antes) e o risco, pra mostrar o porquê
export const PESO_TIPO: Record<TipoConta, { peso: number; risco: string }> = {
  cartao: { peso: 7, risco: "juros do rotativo, os mais altos" },
  aluguel: { peso: 6, risco: "multa e risco de despejo" },
  condominio: { peso: 5, risco: "multa e juros" },
  luz: { peso: 5, risco: "risco de corte" },
  agua: { peso: 5, risco: "risco de corte" },
  gas: { peso: 5, risco: "risco de corte" },
  financiamento: { peso: 4, risco: "juros e nome sujo" },
  emprestimo: { peso: 4, risco: "juros e nome sujo" },
  imposto: { peso: 4, risco: "multa e juros" },
  escola: { peso: 3, risco: "multa" },
  saude: { peso: 3, risco: "pode perder a cobertura" },
  seguro: { peso: 3, risco: "pode perder a cobertura" },
  internet: { peso: 2, risco: "risco de corte" },
  telefone: { peso: 2, risco: "risco de corte" },
  assinatura: { peso: 1, risco: "no máximo cancela" },
  outra: { peso: 2, risco: "" },
};

// Conta solta (sem fixo) não tem tipo: adivinha pela descrição
const PISTAS: [RegExp, TipoConta][] = [
  [/fatura|cart[aã]o/i, "cartao"],
  [/aluguel/i, "aluguel"],
  [/condom[ií]nio/i, "condominio"],
  [/\bluz\b|energia|enel|cemig|light|copel|celpe|coelba/i, "luz"],
  [/[aá]gua|sabesp|cedae|saneamento/i, "agua"],
  [/\bg[aá]s\b|comg[aá]s/i, "gas"],
  [/financiamento|presta[cç][aã]o do carro/i, "financiamento"],
  [/empr[eé]stimo/i, "emprestimo"],
  [/iptu|ipva|imposto|das\b|darf/i, "imposto"],
  [/escola|faculdade|curso|mensalidade/i, "escola"],
  [/plano de sa[uú]de|unimed|amil|bradesco sa[uú]de/i, "saude"],
  [/seguro/i, "seguro"],
  [/internet|fibra|vivo fibra|claro net/i, "internet"],
  [/telefone|celular|\bvivo\b|\bclaro\b|\btim\b|\boi\b/i, "telefone"],
  [/netflix|spotify|assinatura|prime video|disney|youtube|\bhbo\b/i, "assinatura"],
];

export function tipoDaConta(tipoConta: string | null | undefined, descricao: string): TipoConta {
  if (tipoConta && tipoContaValido(tipoConta)) return tipoConta;
  return PISTAS.find(([re]) => re.test(descricao))?.[1] ?? "outra";
}

export type Urgencia = { nivel: NivelUrgencia; peso: number; motivo: string };

// Conta paga ou de débito automático não tem urgência (null)
export function urgenciaConta(
  c: { paga: boolean; automatico: boolean; vencimento: string; descricao: string; tipoConta?: string | null; negociacao?: string | null },
  hoje: string,
): Urgencia | null {
  if (c.paga || c.automatico) return null;
  const tipo = tipoDaConta(c.tipoConta, c.descricao);
  const { peso, risco } = PESO_TIPO[tipo];
  if (c.negociacao === "negociando") return { nivel: "negociando", peso, motivo: "em negociação, combine a data e o valor" };
  const dias = diasAtePrazo(c.vencimento, hoje);
  const nivel: NivelUrgencia = dias <= 1 ? "urgente" : dias <= 7 ? "logo" : "calma";
  const prazo = c.negociacao === "acordo" ? `acordo: ${textoVencimento(c.vencimento, hoje)}` : textoVencimento(c.vencimento, hoje);
  return { nivel, peso, motivo: risco && nivel !== "calma" ? `${prazo}, ${risco}` : prazo };
}

// Ordem de pagar: nível (urgente primeiro), depois o peso, depois quem vence antes
export function ordenarPorUrgencia<T extends { vencimento: string; urgencia: Urgencia }>(contas: T[]): T[] {
  return [...contas].sort(
    (a, b) =>
      ORDEM_URGENCIA.indexOf(a.urgencia.nivel) - ORDEM_URGENCIA.indexOf(b.urgencia.nivel) ||
      b.urgencia.peso - a.urgencia.peso ||
      a.vencimento.localeCompare(b.vencimento),
  );
}
