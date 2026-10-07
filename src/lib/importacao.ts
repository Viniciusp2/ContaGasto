// Importar lançamentos (ex.: extrato do banco já convertido). Só adiciona: nunca apaga nem substitui.
import { dataValida } from "./datas";
import { MAX_CENTAVOS } from "./dinheiro";

export type LinhaImportacao = {
  data: string;
  descricao: string;
  valor: number; // centavos, sempre positivo
  tipo: "gasto" | "entrada";
  categoria: string; // nome da categoria; se não existir, vai pra "Outros"
  forma: string | null; // nome da forma de pagamento
  conta: string | null; // banco (Itaú, C6...): se não existir, é criado com o selo dele
  obs: string | null;
};

export const LIMITE_IMPORTACAO = 5000;

export function lerImportacao(texto: string): { ok: true; linhas: LinhaImportacao[] } | { ok: false; erro: string } {
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return { ok: false, erro: "Esse arquivo não é JSON." };
  }
  const arquivo = json as { app?: unknown; tipo?: unknown; lancamentos?: unknown };
  if (arquivo?.app !== "bolso" || arquivo.tipo !== "importacao") {
    return { ok: false, erro: "Esse arquivo não é uma importação do Bolso. (Backup completo é em Restaurar.)" };
  }
  if (!Array.isArray(arquivo.lancamentos) || arquivo.lancamentos.length === 0) return { ok: false, erro: "Arquivo sem lançamentos." };
  if (arquivo.lancamentos.length > LIMITE_IMPORTACAO) return { ok: false, erro: "Arquivo grande demais." };

  const linhas: LinhaImportacao[] = [];
  for (const [i, bruta] of arquivo.lancamentos.entries()) {
    const l = bruta as Record<string, unknown>;
    const n = i + 1;
    if (typeof l.data !== "string" || !dataValida(l.data)) return { ok: false, erro: `Linha ${n}: data inválida.` };
    if (l.tipo !== "gasto" && l.tipo !== "entrada") return { ok: false, erro: `Linha ${n}: tipo tem que ser gasto ou entrada.` };
    if (!Number.isInteger(l.valor) || (l.valor as number) <= 0 || (l.valor as number) > MAX_CENTAVOS) {
      return { ok: false, erro: `Linha ${n}: valor inválido (centavos, maior que zero).` };
    }
    const descricao = typeof l.descricao === "string" ? l.descricao.trim().slice(0, 80) : "";
    if (!descricao) return { ok: false, erro: `Linha ${n}: falta a descrição.` };
    linhas.push({
      data: l.data,
      descricao,
      valor: l.valor as number,
      tipo: l.tipo,
      categoria: typeof l.categoria === "string" ? l.categoria.trim() : "Outros",
      forma: typeof l.forma === "string" && l.forma.trim() ? l.forma.trim() : null,
      obs: typeof l.obs === "string" && l.obs.trim() ? l.obs.trim().slice(0, 500) : null,
      conta: typeof l.conta === "string" && l.conta.trim() ? l.conta.trim().slice(0, 30) : null,
    });
  }
  return { ok: true, linhas };
}

// Mesmo dia, valor, tipo e descrição: é o mesmo lançamento (importar duas vezes não duplica)
export function chaveDoLancamento(l: { data: string; valor: number; tipo: string; descricao: string }) {
  return `${l.data}|${l.valor}|${l.tipo}|${l.descricao.trim().toLowerCase()}`;
}

// Tira o que já existe, contando repetidos: dois cafés iguais no mesmo dia são dois lançamentos
export function separarNovos<T extends LinhaImportacao>(linhas: T[], existentes: { data: string; valor: number; tipo: string; descricao: string }[]) {
  const restantes = new Map<string, number>();
  for (const e of existentes) {
    const k = chaveDoLancamento(e);
    restantes.set(k, (restantes.get(k) ?? 0) + 1);
  }
  const novos: T[] = [];
  let repetidos = 0;
  for (const l of linhas) {
    const k = chaveDoLancamento(l);
    const ja = restantes.get(k) ?? 0;
    if (ja > 0) {
      restantes.set(k, ja - 1);
      repetidos++;
    } else novos.push(l);
  }
  return { novos, repetidos };
}
