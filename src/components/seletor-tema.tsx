import { Monitor, Moon, Sun } from "lucide-react";
import { definirTema } from "@/app/tema-actions";
import type { Tema } from "@/lib/tema";

const opcoes: { valor: Tema; rotulo: string; Icone: typeof Sun }[] = [
  { valor: "sistema", rotulo: "Sistema", Icone: Monitor },
  { valor: "claro", rotulo: "Claro", Icone: Sun },
  { valor: "escuro", rotulo: "Escuro", Icone: Moon },
];

export function SeletorTema({ atual }: { atual: Tema }) {
  return (
    <section className="rounded-card bg-cartao p-4 shadow-suave">
      <h2 className="mb-3 font-semibold">Tema</h2>
      <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-2">
        {opcoes.map(({ valor, rotulo, Icone }) => (
          <form key={valor} action={definirTema.bind(null, valor)}>
            <button
              type="submit"
              role="radio"
              aria-checked={atual === valor}
              className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-2xl text-sm ${
                atual === valor ? "bg-lavanda font-semibold" : "bg-fundo"
              }`}
            >
              <Icone size={18} aria-hidden />
              {rotulo}
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
