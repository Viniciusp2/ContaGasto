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

// Conciliação (07/10/2026): o que já está no app manda. Lançamento do extrato que bate com um que você
// já tem não vira outro: só completa o seu (banco, forma, observação e descrição, se a sua era só a categoria).
export type Existente = {
  id: string;
  data: string;
  vencimento: string | null;
  valor: number;
  tipo: string;
  descricao: string;
  descricaoGenerica: boolean; // a descrição é só o nome da categoria (deixada em branco)
  contaNome: string | null;
  status: "confirmado" | "a_pagar" | "estimado";
};

export type Completar<T> = { id: string; linha: T; pagar: boolean; trocarDescricao: boolean };

export const JANELA_DIAS = 4; // diferença de dias aceita entre o que você lançou e o que o banco registrou
const PAGOU_ATE_DIAS_ANTES = 7; // conta a pagar quitada até 7 dias antes do vencimento...
const PAGOU_ATE_DIAS_DEPOIS = 45; // ...ou até 45 dias depois (conta atrasada)

function diasEntre(a: string, b: string) {
  const d = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  return Math.round((d(b) - d(a)) / 86_400_000);
}

export function conciliar<T extends LinhaImportacao>(linhas: T[], existentes: Existente[]) {
  // 1. Igual de verdade (mesmo dia, valor, tipo e descrição): já importado antes
  const { novos: restantes, repetidos: iguais } = separarNovos(linhas, existentes);
  const usados = new Set<string>();
  // Os iguais "gastam" um existente cada, pra não serem casados de novo
  for (const l of linhas) {
    if (restantes.includes(l)) continue;
    const e = existentes.find((x) => !usados.has(x.id) && chaveDoLancamento(x) === chaveDoLancamento(l));
    if (e) usados.add(e.id);
  }

  const novos: T[] = [];
  const completar: Completar<T>[] = [];
  let repetidos = iguais;
  const mesmaConta = (e: Existente, l: T) => e.contaNome !== null && l.conta !== null && e.contaNome.toLowerCase() === l.conta.toLowerCase();

  for (const l of [...restantes].sort((a, b) => a.data.localeCompare(b.data))) {
    const candidatos = existentes.filter((e) => !usados.has(e.id) && e.tipo === l.tipo && e.valor === l.valor && (e.contaNome === null || mesmaConta(e, l)));

    // 2. Já veio do mesmo banco (talvez você editou a descrição): é o mesmo, não mexe
    const editado = candidatos.find((e) => mesmaConta(e, l) && Math.abs(diasEntre(e.data, l.data)) <= JANELA_DIAS);
    if (editado) {
      usados.add(editado.id);
      repetidos++;
      continue;
    }

    // 3. Conta que estava a pagar: o extrato mostra que foi paga. Quita a mais antiga primeiro.
    const aPagar = candidatos
      .filter((e) => e.contaNome === null && e.status === "a_pagar" && l.tipo === "gasto")
      .filter((e) => {
        const dias = diasEntre(e.vencimento ?? e.data, l.data);
        return dias >= -PAGOU_ATE_DIAS_ANTES && dias <= PAGOU_ATE_DIAS_DEPOIS;
      })
      .sort((a, b) => (a.vencimento ?? a.data).localeCompare(b.vencimento ?? b.data))[0];
    if (aPagar) {
      usados.add(aPagar.id);
      completar.push({ id: aPagar.id, linha: l, pagar: true, trocarDescricao: aPagar.descricaoGenerica });
      continue;
    }

    // 4. Lançado por você perto da data do banco: completa o seu (o mais próximo)
    const seu = candidatos
      .filter((e) => e.contaNome === null && e.status === "confirmado" && Math.abs(diasEntre(e.data, l.data)) <= JANELA_DIAS)
      .sort((a, b) => Math.abs(diasEntre(a.data, l.data)) - Math.abs(diasEntre(b.data, l.data)))[0];
    if (seu) {
      usados.add(seu.id);
      completar.push({ id: seu.id, linha: l, pagar: false, trocarDescricao: seu.descricaoGenerica });
      continue;
    }

    novos.push(l);
  }
  return { novos, repetidos, completar };
}

// Cópias a mais de lançamentos importados (ex.: a mesma importação rodou duas vezes ao mesmo tempo).
// O arquivo é a fonte da verdade: de cada lançamento (dia, valor, tipo, descrição e banco) fica no app no máximo
// quantos o arquivo tem. Só conta o que veio de extrato; o que você lançou à mão nunca entra aqui.
// Apaga as cópias mais novas e mantém a mais antiga (a que pode ter sido conciliada ou editada).
export type Importado = { id: string; data: string; valor: number; tipo: string; descricao: string; contaNome: string | null; criadoEm: Date };

const chaveComBanco = (l: { data: string; valor: number; tipo: string; descricao: string }, conta: string | null) =>
  `${chaveDoLancamento(l)}|${(conta ?? "").toLowerCase()}`;

export function copiasAMais(linhas: LinhaImportacao[], importados: Importado[]): string[] {
  const noArquivo = new Map<string, number>();
  for (const l of linhas) {
    const k = chaveComBanco(l, l.conta);
    noArquivo.set(k, (noArquivo.get(k) ?? 0) + 1);
  }
  const noApp = new Map<string, Importado[]>();
  for (const i of importados) {
    const k = chaveComBanco(i, i.contaNome);
    if (!noArquivo.has(k)) continue; // não é deste arquivo: não mexe
    noApp.set(k, [...(noApp.get(k) ?? []), i]);
  }
  const apagar: string[] = [];
  for (const [k, lista] of noApp) {
    const sobra = lista.length - noArquivo.get(k)!;
    if (sobra <= 0) continue;
    const maisNovosPrimeiro = [...lista].sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime() || b.id.localeCompare(a.id));
    apagar.push(...maisNovosPrimeiro.slice(0, sobra).map((i) => i.id));
  }
  return apagar;
}

// Lançamento seu (feito à mão ou gerado por fixo) que tem um gêmeo vindo do extrato: mesmo tipo e valor,
// até 4 dias de diferença. O do extrato fica (decisão do Vinícius em 07/10/2026); o seu é apagado.
// Cada lançamento do extrato "absorve" no máximo um seu, o mais perto na data.
export type ParaDuplicar = { id: string; data: string; valor: number; tipo: string; descricao: string };

export function manuaisDuplicados(manuais: ParaDuplicar[], doExtrato: ParaDuplicar[]) {
  const usados = new Set<string>();
  const pares: { manual: ParaDuplicar; extrato: ParaDuplicar }[] = [];
  for (const e of [...doExtrato].sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id))) {
    const m = manuais
      .filter((x) => !usados.has(x.id) && x.tipo === e.tipo && x.valor === e.valor && Math.abs(diasEntre(x.data, e.data)) <= JANELA_DIAS)
      .sort((a, b) => Math.abs(diasEntre(a.data, e.data)) - Math.abs(diasEntre(b.data, e.data)) || a.id.localeCompare(b.id))[0];
    if (!m) continue;
    usados.add(m.id);
    pares.push({ manual: m, extrato: e });
  }
  return pares.sort((a, b) => a.manual.data.localeCompare(b.manual.data));
}

// Veio de extrato? (a observação guarda o texto do banco)
export const veioDeExtrato = (obs: string | null) => Boolean(obs && /Extrato (Itaú|C6|Alelo|[A-Za-zÀ-ú0-9 ]+):/.test(obs));
