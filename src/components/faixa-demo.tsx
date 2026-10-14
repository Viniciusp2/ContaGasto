import { FlaskConical, RotateCcw } from "lucide-react";
import { restaurarExemplo } from "@/app/demo/actions";
import { MINUTOS_SEM_USO_PRA_RESTAURAR } from "@/lib/demo";

// Faixa no topo da demonstração: avisa que os dados são inventados e deixa voltar ao exemplo
export function FaixaDemo() {
  return (
    <div className="mx-auto mb-4 flex w-full max-w-md items-center gap-3 rounded-card bg-limao px-4 py-3 text-sm md:max-w-3xl lg:max-w-5xl">
      <FlaskConical size={20} className="shrink-0" aria-hidden />
      <p className="flex-1">
        <strong>Demonstração.</strong> Dados inventados: pode mexer à vontade. Tudo volta ao exemplo depois de{" "}
        {MINUTOS_SEM_USO_PRA_RESTAURAR} min sem uso.
      </p>
      <form action={restaurarExemplo}>
        <button
          type="submit"
          className="flex min-h-11 items-center gap-1 rounded-full bg-cartao px-3 font-semibold shadow-suave"
          title="Voltar todos os dados pro exemplo"
        >
          <RotateCcw size={16} aria-hidden /> Restaurar
        </button>
      </form>
    </div>
  );
}
