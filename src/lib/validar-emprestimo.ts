import { dataValida } from "./datas";
import { MAX_CENTAVOS } from "./dinheiro";

export type DadosEmprestimo = {
  direcao: "a_receber" | "a_pagar";
  pessoa: string;
  valor: number;
  data: string;
  prazo: string | null; // prazo pra devolver, opcional
  descricao: string;
};

const texto = (formData: FormData, campo: string) => String(formData.get(campo) ?? "").trim();

function lerValor(formData: FormData, campo: string): number | null {
  const valor = Number(texto(formData, campo));
  return Number.isInteger(valor) && valor > 0 && valor <= MAX_CENTAVOS ? valor : null;
}

export function validarEmprestimo(
  formData: FormData,
): { ok: true; dados: DadosEmprestimo } | { ok: false; erro: string } {
  const direcao = texto(formData, "direcao");
  if (direcao !== "a_receber" && direcao !== "a_pagar") {
    return { ok: false, erro: "Diga se você emprestou ou pegou emprestado." };
  }

  const pessoa = texto(formData, "pessoa");
  if (!pessoa) return { ok: false, erro: "Com quem foi?" };
  if (pessoa.length > 60) return { ok: false, erro: "O nome pode ter até 60 letras." };

  const valor = lerValor(formData, "valor");
  if (valor === null) return { ok: false, erro: "Digite um valor maior que zero." };

  const data = texto(formData, "data");
  if (!dataValida(data)) return { ok: false, erro: "Data inválida." };

  const prazo = texto(formData, "prazo") || null;
  if (prazo && !dataValida(prazo)) return { ok: false, erro: "Prazo inválido." };
  if (prazo && prazo < data) return { ok: false, erro: "O prazo não pode ser antes do empréstimo." };

  const descricao = texto(formData, "descricao");
  if (descricao.length > 80) return { ok: false, erro: "A descrição pode ter até 80 letras." };

  return { ok: true, dados: { direcao, pessoa, valor, data, prazo, descricao } };
}

// Quitar: data do pagamento e, no "paguei", quanto pagou (pode ter juros)
export function validarQuitacao(
  formData: FormData,
  dataEmprestimo: string,
): { ok: true; data: string; valor: number | null } | { ok: false; erro: string } {
  const data = texto(formData, "data");
  if (!dataValida(data)) return { ok: false, erro: "Data inválida." };
  if (data < dataEmprestimo) return { ok: false, erro: "A quitação não pode ser antes do empréstimo." };

  if (!texto(formData, "valor")) return { ok: true, data, valor: null };
  const valor = lerValor(formData, "valor");
  if (valor === null) return { ok: false, erro: "Digite quanto foi pago." };
  return { ok: true, data, valor };
}

// Quanto falta pro prazo (negativo = atrasado)
export function diasAtePrazo(prazo: string, hoje: string): number {
  const dia = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
  return Math.round((dia(prazo) - dia(hoje)) / 86_400_000);
}

export function textoDoPrazo(prazo: string, hoje: string): { texto: string; atrasado: boolean } {
  const dias = diasAtePrazo(prazo, hoje);
  if (dias < 0) return { texto: dias === -1 ? "atrasado 1 dia" : `atrasado ${-dias} dias`, atrasado: true };
  if (dias === 0) return { texto: "vence hoje", atrasado: false };
  if (dias === 1) return { texto: "vence amanhã", atrasado: false };
  return { texto: `vence em ${dias} dias`, atrasado: false };
}
