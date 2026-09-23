import {
  Briefcase,
  Car,
  CirclePlus,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  Heart,
  HeartPulse,
  House,
  Laptop,
  Lightbulb,
  Package,
  PiggyBank,
  Plane,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tag,
  Tv,
  Umbrella,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

// Ícone da categoria (ou do objetivo) pelo nome salvo no banco (coluna "icone"). Sem emoji na interface.
const icones: Record<string, LucideIcon> = {
  Briefcase,
  Car,
  CirclePlus,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  Heart,
  HeartPulse,
  House,
  Laptop,
  Lightbulb,
  Package,
  PiggyBank,
  Plane,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tv,
  Umbrella,
  Utensils,
  UtensilsCrossed,
};

export function IconeCategoria({ nome, size = 20 }: { nome: string; size?: number }) {
  const Icone = icones[nome] ?? Tag;
  return <Icone size={size} aria-hidden />;
}
