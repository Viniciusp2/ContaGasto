// Holerite do salário (CLAUDE.md 4.2): só pra consulta. O valor do lançamento é o líquido.
import { MAX_CENTAVOS } from "./dinheiro";

export type Desconto = { nome: string; valor: number };
export type Holerite = { bruto: number; descontos: Desconto[] };

export const MAX_DESCONTOS = 20;

export function liquidoDoHolerite(h: Holerite): number {
  return h.bruto - h.descontos.reduce((total, d) => total + d.valor, 0);
}

const centavosValidos = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v > 0 && v <= MAX_CENTAVOS;

// Recebe o JSON do formulário. Vazio = sem holerite.
export function lerHolerite(json: string): { ok: true; holerite: Holerite | null } | { ok: false; erro: string } {
  if (!json.trim()) return { ok: true, holerite: null };

  let bruto: unknown;
  let descontos: unknown;
  try {
    ({ bruto, descontos } = JSON.parse(json));
  } catch {
    return { ok: false, erro: "Holerite inválido." };
  }

  if (!centavosValidos(bruto)) return { ok: false, erro: "Digite o salário bruto." };
  if (!Array.isArray(descontos) || descontos.length > MAX_DESCONTOS) return { ok: false, erro: "Descontos inválidos." };

  const limpos: Desconto[] = [];
  for (const d of descontos) {
    const nome = typeof d?.nome === "string" ? d.nome.trim() : "";
    if (!nome && !d?.valor) continue; // linha em branco
    if (!nome || nome.length > 40) return { ok: false, erro: "Dê um nome curto pra cada desconto." };
    if (!centavosValidos(d.valor)) return { ok: false, erro: `Valor inválido em "${nome}".` };
    limpos.push({ nome, valor: d.valor });
  }

  const holerite = { bruto, descontos: limpos };
  if (liquidoDoHolerite(holerite) <= 0) return { ok: false, erro: "Os descontos passam do bruto." };
  return { ok: true, holerite };
}
