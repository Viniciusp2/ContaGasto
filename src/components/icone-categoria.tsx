import {
  Briefcase,
  Car,
  CirclePlus,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Lightbulb,
  Package,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Tv,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

// Ícone da categoria pelo nome salvo no banco (coluna "icone"). Sem emoji na interface.
const icones: Record<string, LucideIcon> = {
  Briefcase,
  Car,
  CirclePlus,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Lightbulb,
  Package,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Tv,
  Utensils,
  UtensilsCrossed,
};

export function IconeCategoria({ nome, size = 20 }: { nome: string; size?: number }) {
  const Icone = icones[nome] ?? Tag;
  return <Icone size={size} aria-hidden />;
}
