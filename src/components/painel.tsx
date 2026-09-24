import Link from "next/link";
import { ChevronRight, Sparkles, TrendingUp, Tv } from "lucide-react";
import { formatarCentavos } from "@/lib/dinheiro";
import { NumeroAnimado } from "@/components/animacoes";

// Destaque do Início: quanto dá pra gastar sem comprometer o que já tem destino
export function CartaoDisponivel({
  disponivel,
  porDia,
  diasRestantes,
  guardado,
  compromissos,
}: {
  disponivel: number;
  porDia: number | null;
  diasRestantes: number;
  guardado: number;
  compromissos: number;
}) {
  const semFolga = porDia === null;
  return (
    <section className={`rounded-card p-5 shadow-suave ${semFolga ? "bg-coral" : "bg-menta"}`}>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles size={18} aria-hidden /> Disponível para gastar
      </p>
      <p className="mt-1 text-3xl font-bold tabular-nums">
        <NumeroAnimado centavos={disponivel} />
      </p>
      <p className="mt-2 text-base font-semibold">
        {semFolga
          ? "Sem folga até o fim do mês"
          : `Dá pra gastar ${formatarCentavos(porDia)} por dia`}
        <span className="font-normal"> · {diasRestantes === 1 ? "último dia" : `${diasRestantes} dias`}</span>
      </p>
      <p className="mt-1 text-sm">
        Já desconta {formatarCentavos(compromissos)} que ainda vai cair
        {guardado !== 0 ? ` e ${formatarCentavos(guardado)} guardados no mês` : ""}.
      </p>
    </section>
  );
}

export function CartaoPrevisao({ previsao, entradas }: { previsao: number; entradas: number }) {
  const sobra = entradas - previsao;
  return (
    <section className="flex items-center gap-3 rounded-card bg-cartao p-4 shadow-suave">
      <span className="inline-flex rounded-full bg-limao p-2">
        <TrendingUp size={20} aria-hidden />
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold">Previsão de gasto no mês</p>
        <p className="text-xs text-tinta-suave">
          {sobra >= 0 ? `Deve sobrar ${formatarCentavos(sobra)}` : `Deve faltar ${formatarCentavos(-sobra)}`} com o que já entrou
        </p>
      </div>
      <p className="text-lg font-bold tabular-nums">{formatarCentavos(previsao)}</p>
    </section>
  );
}

export function CartoesDoProximoMes({
  comprometido,
  assinaturas,
  quantasAssinaturas,
}: {
  comprometido: number;
  assinaturas: number;
  quantasAssinaturas: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link href="/fixos" className="rounded-card bg-cartao p-4 shadow-suave">
        <p className="flex items-center justify-between text-sm font-semibold">
          Próximo mês <ChevronRight size={16} aria-hidden />
        </p>
        <p className="text-xs text-tinta-suave">Já comprometido</p>
        <p className="mt-1 text-lg font-bold tabular-nums">{formatarCentavos(comprometido)}</p>
      </Link>
      <Link href="/fixos" className="rounded-card bg-cartao p-4 shadow-suave">
        <p className="flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-1">
            <Tv size={16} aria-hidden /> Assinaturas
          </span>
          <ChevronRight size={16} aria-hidden />
        </p>
        <p className="text-xs text-tinta-suave">
          {quantasAssinaturas === 0 ? "Nenhuma ativa" : `${quantasAssinaturas} ativa${quantasAssinaturas > 1 ? "s" : ""}, por mês`}
        </p>
        <p className="mt-1 text-lg font-bold tabular-nums">{formatarCentavos(assinaturas)}</p>
      </Link>
    </div>
  );
}
