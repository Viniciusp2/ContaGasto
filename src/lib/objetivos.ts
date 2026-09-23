// Objetivos / caixinhas (CLAUDE.md 4.7). O saldo nunca é gravado: é a soma dos movimentos.
import { dataValida, mesDe } from "./datas";
import { MAX_CENTAVOS } from "./dinheiro";

export const ICONES_OBJETIVO = [
  "PiggyBank",
  "Smartphone",
  "Laptop",
  "Plane",
  "Car",
  "House",
  "GraduationCap",
  "Gift",
  "Heart",
  "Umbrella",
] as const;
export type IconeObjetivo = (typeof ICONES_OBJETIVO)[number];

// Positivo = guardou, negativo = resgatou
export function saldoObjetivo(movimentos: { valor: number }[]): number {
  return movimentos.reduce((total, m) => total + m.valor, 0);
}

// Meses cheios até o mês do alvo (set/2026 até dez/2026 = 3). Mês do alvo ou passado = 1: guardar o resto agora.
export function mesesAteOAlvo(hoje: string, dataAlvo: string): number {
  const a = mesDe(hoje);
  const b = mesDe(dataAlvo);
  return Math.max(1, (b.ano - a.ano) * 12 + (b.mes - a.mes));
}

export function planoDoObjetivo(valorAlvo: number, saldo: number, hoje: string, dataAlvo: string) {
  const falta = Math.max(0, valorAlvo - saldo);
  const meses = mesesAteOAlvo(hoje, dataAlvo);
  return {
    falta,
    meses,
    // Arredonda pra cima: guardando isso todo mês, chega no alvo
    porMes: falta === 0 ? 0 : Math.ceil(falta / meses),
    fracao: valorAlvo > 0 ? saldo / valorAlvo : 0,
    concluido: saldo >= valorAlvo,
    prazoPassou: dataAlvo < hoje && saldo < valorAlvo,
  };
}

const texto = (fd: FormData, campo: string) => String(fd.get(campo) ?? "").trim();

function centavos(fd: FormData, campo: string): number | null {
  const v = Number(texto(fd, campo));
  return Number.isInteger(v) && v > 0 && v <= MAX_CENTAVOS ? v : null;
}

export function validarObjetivo(
  fd: FormData,
): { ok: true; dados: { nome: string; icone: IconeObjetivo; valorAlvo: number; dataAlvo: string } } | { ok: false; erro: string } {
  const nome = texto(fd, "nome");
  if (!nome) return { ok: false, erro: "Dê um nome pro objetivo." };
  if (nome.length > 40) return { ok: false, erro: "O nome pode ter até 40 letras." };

  const icone = (texto(fd, "icone") || "PiggyBank") as IconeObjetivo;
  if (!ICONES_OBJETIVO.includes(icone)) return { ok: false, erro: "Ícone inválido." };

  const valorAlvo = centavos(fd, "valorAlvo");
  if (valorAlvo === null) return { ok: false, erro: "Quanto você quer juntar?" };

  const dataAlvo = texto(fd, "dataAlvo");
  if (!dataValida(dataAlvo)) return { ok: false, erro: "Até quando?" };

  return { ok: true, dados: { nome, icone, valorAlvo, dataAlvo } };
}

// Guardar ou resgatar. Resgatar mais do que tem não pode.
export function validarMovimento(
  fd: FormData,
  saldoAtual: number,
): { ok: true; valor: number; data: string } | { ok: false; erro: string } {
  const tipo = texto(fd, "tipo");
  if (tipo !== "guardar" && tipo !== "resgatar") return { ok: false, erro: "Guardar ou resgatar?" };

  const valor = centavos(fd, "valor");
  if (valor === null) return { ok: false, erro: "Digite um valor maior que zero." };
  if (tipo === "resgatar" && valor > saldoAtual) return { ok: false, erro: "Não dá pra resgatar mais do que tem guardado." };

  const data = texto(fd, "data");
  if (!dataValida(data)) return { ok: false, erro: "Data inválida." };

  return { ok: true, valor: tipo === "guardar" ? valor : -valor, data };
}
