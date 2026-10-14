import { Pause, Play } from "lucide-react";
import { pausarRecorrencia, retomarRecorrencia } from "@/app/fixos/actions";

// Pausar não pede confirmação: é só retomar depois, nada se perde
export function BotaoPausar({ id }: { id: string }) {
  return (
    <form action={pausarRecorrencia.bind(null, id)}>
      <button type="submit" className="flex min-h-11 items-center gap-1 rounded-full bg-fundo px-4 text-sm font-semibold">
        <Pause size={14} aria-hidden /> Pausar
      </button>
    </form>
  );
}

export function BotaoRetomar({ id }: { id: string }) {
  return (
    <form action={retomarRecorrencia.bind(null, id)}>
      <button type="submit" className="flex min-h-11 items-center gap-1 rounded-full bg-menta px-4 text-sm font-semibold">
        <Play size={14} aria-hidden /> Retomar
      </button>
    </form>
  );
}
