import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AssistenteConversa } from "@/components/assistente-conversa";

export const dynamic = "force-dynamic";
// Uma pergunta pode precisar de 2 ou 3 chamadas à IA
export const maxDuration = 60;

export default function Assistente() {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link href="/mais" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave">
          <ArrowLeft size={16} aria-hidden /> Mais
        </Link>
        <h1 className="text-2xl font-bold">Assistente</h1>
        <p className="text-sm text-tinta-suave">Lança por você, analisa o mês e responde sobre o seu dinheiro.</p>
      </div>
      <AssistenteConversa />
    </section>
  );
}
