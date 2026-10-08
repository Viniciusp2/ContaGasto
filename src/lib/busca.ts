// Busca na lista de lançamentos: ignora acento e maiúscula ("farmacia" acha "Farmácia")
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

type Buscavel = { descricao: string; categoriaNome: string; formaNome?: string | null; obs?: string | null; valor: number };

// Todas as palavras precisam aparecer em algum campo. Número busca também pelo valor ("45,90" ou "45").
export function filtrarLancamentos<T extends Buscavel>(lista: T[], busca: string): T[] {
  const palavras = normalizar(busca).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return lista;
  return lista.filter((l) => {
    const reais = (l.valor / 100).toFixed(2);
    const campos = normalizar([l.descricao, l.categoriaNome, l.formaNome ?? "", l.obs ?? "", reais, reais.replace(".", ",")].join(" "));
    return palavras.every((p) => campos.includes(p));
  });
}

// Ordem da lista de lançamentos (pedido em 07/10/2026). "recentes" é o padrão.
export const ORDENS = [
  { valor: "recentes", rotulo: "Mais novos" },
  { valor: "antigos", rotulo: "Mais antigos" },
  { valor: "maior", rotulo: "Maior valor" },
  { valor: "menor", rotulo: "Menor valor" },
] as const;
export type Ordem = (typeof ORDENS)[number]["valor"];

export function lerOrdem(texto: string | undefined): Ordem {
  return ORDENS.some((o) => o.valor === texto) ? (texto as Ordem) : "recentes";
}

// Por data, a lista continua agrupada por dia; por valor, vira uma lista só (o dia aparece em cada linha)
export function ordenarLancamentos<T extends { data: string; valor: number }>(itens: T[], ordem: Ordem): T[] {
  const copia = [...itens];
  if (ordem === "maior") return copia.sort((a, b) => b.valor - a.valor || b.data.localeCompare(a.data));
  if (ordem === "menor") return copia.sort((a, b) => a.valor - b.valor || b.data.localeCompare(a.data));
  if (ordem === "antigos") return copia.reverse(); // a lista vem do mais novo pro mais antigo
  return copia;
}
