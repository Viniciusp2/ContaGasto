"use client";

import { Printer } from "lucide-react";

// Abre o imprimir do navegador; nele dá pra "Salvar como PDF"
export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-coral px-4 font-semibold print:hidden"
    >
      <Printer size={18} aria-hidden /> Salvar em PDF ou imprimir
    </button>
  );
}
