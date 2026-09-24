// Backup (Sprint 4.3): um JSON com todos os dados do usuário. Restaurar substitui tudo.

export const VERSAO_BACKUP = 1;

// Ordem de inserção respeita as chaves estrangeiras; apagar usa a ordem inversa
export const TABELAS_BACKUP = [
  "categorias",
  "formasPagamento",
  "recorrencias",
  "lancamentos",
  "metas",
  "objetivos",
  "movimentosObjetivo",
  "emprestimos",
] as const;
export type TabelaBackup = (typeof TABELAS_BACKUP)[number];

export type Backup = {
  app: "bolso";
  versao: number;
  geradoEm: string;
  dados: Record<TabelaBackup, Record<string, unknown>[]>;
};

export const LIMITE_LINHAS = 200_000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Confere o arquivo antes de tocar no banco. Só aceita backup do Bolso, da versão conhecida.
export function lerBackup(texto: string): { ok: true; backup: Backup; linhas: number } | { ok: false; erro: string } {
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return { ok: false, erro: "Esse arquivo não é um backup (JSON inválido)." };
  }
  const b = json as Partial<Backup>;
  if (!b || b.app !== "bolso") return { ok: false, erro: "Esse arquivo não é um backup do Bolso." };
  if (b.versao !== VERSAO_BACKUP) return { ok: false, erro: `Backup da versão ${b.versao}, esse app lê a versão ${VERSAO_BACKUP}.` };
  if (!b.dados || typeof b.dados !== "object") return { ok: false, erro: "Backup sem dados." };

  let linhas = 0;
  for (const tabela of TABELAS_BACKUP) {
    const lista = (b.dados as Record<string, unknown>)[tabela];
    if (!Array.isArray(lista)) return { ok: false, erro: `Backup incompleto: falta "${tabela}".` };
    for (const linha of lista) {
      if (!linha || typeof linha !== "object" || !UUID.test(String((linha as { id?: unknown }).id))) {
        return { ok: false, erro: `Linha inválida em "${tabela}".` };
      }
    }
    linhas += lista.length;
  }
  if (linhas > LIMITE_LINHAS) return { ok: false, erro: "Backup grande demais." };
  if ((b.dados.categorias ?? []).length === 0) return { ok: false, erro: "Backup sem categorias: parece vazio ou quebrado." };

  return { ok: true, backup: b as Backup, linhas };
}

// Datas de criação e edição voltam como texto no JSON; o banco quer Date. E o dono passa a ser quem restaura.
export function prepararLinha(linha: Record<string, unknown>, userId: string) {
  const saida: Record<string, unknown> = { ...linha, userId };
  for (const campo of ["createdAt", "updatedAt"]) {
    if (typeof saida[campo] === "string") saida[campo] = new Date(saida[campo] as string);
  }
  return saida;
}

export function nomeDoArquivo(hoje: string) {
  return `bolso-backup-${hoje}.json`;
}
