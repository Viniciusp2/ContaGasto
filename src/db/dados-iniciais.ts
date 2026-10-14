// Dados que todo Bolso começa tendo: categorias (com ícone e cor) e formas de pagamento.
// Usado pelo script de seed (npm run db:seed) e pelo modo demonstração.
import { categorias, formasPagamento, usuarios } from "./schema";
import type { Banco } from ".";

const cor = {
  lavanda: "#E0CFE8",
  coral: "#FFAC81",
  limao: "#E8E691",
  menta: "#8DFFDB",
  // Pastéis extras pra diferenciar categorias nos gráficos
  azul: "#B8DDFF",
  rosa: "#FFC8DD",
  verde: "#C5EDB0",
  areia: "#F2DDC4",
};

export const categoriasGasto = [
  { nome: "Mercado", emoji: "🛒", icone: "ShoppingCart", cor: cor.verde },
  { nome: "Comida", emoji: "🍔", icone: "UtensilsCrossed", cor: cor.coral },
  { nome: "Transporte", emoji: "🚗", icone: "Car", cor: cor.azul },
  { nome: "Casa", emoji: "🏠", icone: "House", cor: cor.areia },
  { nome: "Contas", emoji: "💡", icone: "Lightbulb", cor: cor.limao },
  { nome: "Saúde", emoji: "💊", icone: "HeartPulse", cor: cor.rosa },
  { nome: "Lazer", emoji: "🎮", icone: "Gamepad2", cor: cor.lavanda },
  { nome: "Assinaturas", emoji: "📺", icone: "Tv", cor: cor.azul },
  { nome: "Compras", emoji: "🛍️", icone: "ShoppingBag", cor: cor.rosa },
  { nome: "Educação", emoji: "📚", icone: "GraduationCap", cor: cor.menta },
  { nome: "Pagamento de empréstimo", emoji: "🤝", icone: "HandCoins", cor: cor.areia },
  { nome: "Outros", emoji: "📦", icone: "Package", cor: cor.lavanda },
];

// Tipos de entrada (ver docs/REGRAS-DE-NEGOCIO.md)
export const categoriasEntrada = [
  { nome: "Salário", emoji: "💼", icone: "Briefcase", cor: cor.menta },
  { nome: "Extra", emoji: "➕", icone: "CirclePlus", cor: cor.verde },
  { nome: "Presente", emoji: "🎁", icone: "Gift", cor: cor.rosa },
  { nome: "Reembolso", emoji: "🔁", icone: "RotateCcw", cor: cor.azul },
  // Desativada: empréstimo vai na tela de Empréstimos (4.6). Fica pra lançamentos antigos.
  { nome: "Empréstimo recebido", emoji: "🤝", icone: "HandCoins", cor: cor.areia, ativa: false },
  { nome: "Outros", emoji: "📦", icone: "Package", cor: cor.lavanda },
  // Saldo à parte, fora do saldo real (4.13)
  { nome: "Vale alimentação", emoji: "🍽️", icone: "Utensils", cor: cor.verde },
];

export const formas = [
  { nome: "Pix", tipo: "pix" },
  { nome: "Débito", tipo: "debito" },
  { nome: "Crédito", tipo: "credito" },
  { nome: "Dinheiro", tipo: "dinheiro" },
  { nome: "Boleto", tipo: "boleto" },
  { nome: "Vale alimentação", tipo: "beneficio" },
] as const;

// Pode rodar quantas vezes quiser: o que já existe é ignorado
export async function semearBasico(banco: Banco, usuario: { id: string; nome: string; email: string }) {
  const userId = usuario.id;
  await banco.insert(usuarios).values(usuario).onConflictDoNothing();
  await banco
    .insert(categorias)
    .values([
      ...categoriasGasto.map((c) => ({ ...c, userId, tipo: "gasto" as const })),
      ...categoriasEntrada.map((c) => ({ ...c, userId, tipo: "entrada" as const })),
    ])
    .onConflictDoNothing();
  await banco
    .insert(formasPagamento)
    .values(formas.map((f) => ({ ...f, userId })))
    .onConflictDoNothing();
}
