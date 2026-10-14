// Configurações: categorias e formas de pagamento (Sprint 5.3). Validação pura, testada.

// Ícones que dá pra escolher (lucide). O componente IconeCategoria conhece todos eles.
export const ICONES_CATEGORIA = [
  "ShoppingCart", "UtensilsCrossed", "Utensils", "Coffee", "Pizza", "Beer",
  "Car", "Fuel", "Bus", "Bike", "Plane",
  "House", "Lightbulb", "Wifi", "Droplet", "Flame", "Wrench",
  "HeartPulse", "Stethoscope", "Dumbbell", "Scissors",
  "Gamepad2", "Tv", "Music", "Popcorn", "Palette",
  "ShoppingBag", "Shirt", "Smartphone", "Laptop", "Gift",
  "GraduationCap", "BookOpen", "Baby", "Dog",
  "Briefcase", "CirclePlus", "RotateCcw", "HandCoins", "Banknote", "Wallet", "Landmark", "TrendingUp", "BadgePercent",
  "PiggyBank", "Package", "Sparkles",
] as const;

// Pastéis da paleta (os mesmos do seed): o ícone em cima fica sempre escuro (.sobre-pastel)
export const CORES_CATEGORIA = ["#C5EDB0", "#FFAC81", "#B8DDFF", "#F2DDC4", "#E8E691", "#FFC8DD", "#E0CFE8", "#8DFFDB"] as const;

// Usadas pela lógica do app pelo nome: dá pra trocar ícone e cor, mas não o nome, e não dá pra desativar
export const NOMES_PROTEGIDOS = ["Salário", "Vale alimentação", "Pagamento de empréstimo", "Outros", "Empréstimo recebido"] as const;

export function categoriaProtegida(nome: string) {
  return (NOMES_PROTEGIDOS as readonly string[]).includes(nome);
}

const texto = (fd: FormData, campo: string) => String(fd.get(campo) ?? "").trim();

export type DadosCategoria = { nome: string; icone: string; cor: string; tipo: "gasto" | "entrada" };

export function validarCategoria(fd: FormData): { ok: true; dados: DadosCategoria } | { ok: false; erro: string } {
  const tipo = texto(fd, "tipo");
  if (tipo !== "gasto" && tipo !== "entrada") return { ok: false, erro: "Gasto ou entrada?" };
  const nome = texto(fd, "nome").replace(/\s+/g, " ");
  if (!nome) return { ok: false, erro: "Dê um nome pra categoria." };
  if (nome.length > 30) return { ok: false, erro: "O nome pode ter até 30 letras." };
  const icone = texto(fd, "icone");
  if (!(ICONES_CATEGORIA as readonly string[]).includes(icone)) return { ok: false, erro: "Escolha um ícone." };
  const cor = texto(fd, "cor").toUpperCase();
  if (!(CORES_CATEGORIA as readonly string[]).includes(cor)) return { ok: false, erro: "Escolha uma cor." };
  return { ok: true, dados: { nome, icone, cor, tipo } };
}

// Formas de pagamento que o usuário pode criar. "beneficio" (VA) é só a do sistema.
export const TIPOS_FORMA = [
  { valor: "pix", rotulo: "Pix" },
  { valor: "debito", rotulo: "Débito" },
  { valor: "credito", rotulo: "Crédito" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "boleto", rotulo: "Boleto" },
] as const;
export type TipoForma = (typeof TIPOS_FORMA)[number]["valor"];

export function validarForma(fd: FormData): { ok: true; dados: { nome: string; tipo: TipoForma } } | { ok: false; erro: string } {
  const nome = texto(fd, "nome").replace(/\s+/g, " ");
  if (!nome) return { ok: false, erro: "Dê um nome, ex. Nubank ou Cartão Inter." };
  if (nome.length > 30) return { ok: false, erro: "O nome pode ter até 30 letras." };
  const tipo = texto(fd, "tipo") as TipoForma;
  if (!TIPOS_FORMA.some((t) => t.valor === tipo)) return { ok: false, erro: "Escolha o tipo." };
  return { ok: true, dados: { nome, tipo } };
}
