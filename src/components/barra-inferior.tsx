"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ListOrdered, Target, Menu } from "lucide-react";

const abas = [
  { href: "/", rotulo: "Início", Icone: House },
  { href: "/lancamentos", rotulo: "Lançamentos", Icone: ListOrdered },
  { href: "/metas", rotulo: "Metas", Icone: Target },
  { href: "/mais", rotulo: "Mais", Icone: Menu },
];

export function BarraInferior() {
  const caminho = usePathname();
  if (caminho === "/entrar") return null;

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-lavanda bg-cartao/90 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md justify-around md:max-w-3xl">
        {abas.map(({ href, rotulo, Icone }) => {
          const ativa = href === "/" ? caminho === "/" : caminho.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={ativa ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                  ativa ? "font-semibold text-tinta" : "text-tinta-suave"
                }`}
              >
                <span
                  className={`rounded-full px-4 py-1 transition-colors ${ativa ? "bg-lavanda" : ""}`}
                >
                  <Icone size={22} aria-hidden />
                </span>
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
