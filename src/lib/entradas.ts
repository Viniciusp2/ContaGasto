// O tipo da entrada (4.2 do CLAUDE.md) sai da categoria escolhida, sem campo extra no formulário.
// Assim "Empréstimo recebido" nunca vira renda por engano.
export type SubtipoEntrada =
  | "salario"
  | "extra"
  | "doacao"
  | "reembolso"
  | "emprestimo"
  | "outros";

const porCategoria: Record<string, SubtipoEntrada> = {
  "Salário": "salario",
  Extra: "extra",
  Presente: "doacao",
  Reembolso: "reembolso",
  "Empréstimo recebido": "emprestimo",
  Outros: "outros",
};

// Categoria de entrada criada pelo usuário no futuro cai em "outros"
export function subtipoDaCategoria(nomeCategoria: string): SubtipoEntrada {
  return porCategoria[nomeCategoria] ?? "outros";
}
