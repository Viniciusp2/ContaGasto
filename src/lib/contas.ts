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
