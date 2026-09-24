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
