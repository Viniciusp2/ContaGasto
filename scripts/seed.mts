// Dados iniciais: usuário padrão, categorias e formas de pagamento.
// Pode rodar quantas vezes quiser: o que já existe é ignorado.
import { count } from "drizzle-orm";
import { db, fecharBanco } from "../src/db";
import { categorias, formasPagamento, usuarios } from "../src/db/schema";
import { USUARIO_PADRAO } from "../src/db/usuario-padrao";

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

const categoriasGasto = [
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

// Seção 4.2 do CLAUDE.md
const categoriasEntrada = [
  { nome: "Salário", emoji: "💼", icone: "Briefcase", cor: cor.menta },
  { nome: "Extra", emoji: "➕", icone: "CirclePlus", cor: cor.verde },
  { nome: "Presente", emoji: "🎁", icone: "Gift", cor: cor.rosa },
  { nome: "Reembolso", emoji: "🔁", icone: "RotateCcw", cor: cor.azul },
  { nome: "Empréstimo recebido", emoji: "🤝", icone: "HandCoins", cor: cor.areia },
  { nome: "Outros", emoji: "📦", icone: "Package", cor: cor.lavanda },
];

const formas = [
  { nome: "Pix", tipo: "pix" },
  { nome: "Débito", tipo: "debito" },
  { nome: "Crédito", tipo: "credito" },
  { nome: "Dinheiro", tipo: "dinheiro" },
  { nome: "Boleto", tipo: "boleto" },
] as const;

const userId = USUARIO_PADRAO.id;

await db.insert(usuarios).values(USUARIO_PADRAO).onConflictDoNothing();

await db
  .insert(categorias)
  .values([
    ...categoriasGasto.map((c) => ({ ...c, userId, tipo: "gasto" as const })),
    ...categoriasEntrada.map((c) => ({ ...c, userId, tipo: "entrada" as const })),
  ])
  .onConflictDoNothing();

await db
  .insert(formasPagamento)
  .values(formas.map((f) => ({ ...f, userId })))
  .onConflictDoNothing();

const [u] = await db.select({ n: count() }).from(usuarios);
const [c] = await db.select({ n: count() }).from(categorias);
const [f] = await db.select({ n: count() }).from(formasPagamento);
console.log(`Seed ok: ${u.n} usuário, ${c.n} categorias, ${f.n} formas de pagamento`);

// Fecha a conexão, senão o PGlite segura o processo aberto
await fecharBanco();
