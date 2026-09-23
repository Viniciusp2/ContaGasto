import Link from "next/link";
import { CalendarClock, ChevronRight, Sparkles, TrendingUp, Tv } from "lucide-react";
import { IconeCategoria } from "@/components/icone-categoria";
import type { Compromisso } from "@/db/painel";
import { diaCurto } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";

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
      <p className="mt-1 text-3xl font-bold tabular-nums">{formatarCentavos(disponivel)}</p>
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

export function ContasAVencer({ itens, hoje }: { itens: Compromisso[]; hoje: string }) {
  if (itens.length === 0) return null;
  const visiveis = itens.slice(0, 6);
  return (
    <section className="rounded-card bg-cartao p-4 shadow-suave">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <CalendarClock size={18} aria-hidden /> Contas a vencer
      </h2>
      <ul className="flex flex-col gap-1">
        {visiveis.map((c) => {
          const alerta = c.tipo === "a_confirmar" || c.detalhe === "atrasado";
          const conteudo = (
            <>
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-lavanda"
                style={c.cor ? { backgroundColor: c.cor } : undefined}
                aria-hidden
              >
                <IconeCategoria nome={c.icone ?? ""} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{c.descricao}</span>
                <span className="block text-xs text-tinta-suave">
                  <span className="capitalize">{c.data === hoje ? "hoje" : diaCurto(c.data)}</span>
                  {c.detalhe && (
                    <span className={`ml-1 rounded-full px-1.5 font-semibold ${alerta ? "bg-coral text-tinta" : "bg-fundo"}`}>
                      {c.detalhe}
                    </span>
                  )}
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums">
                {c.tipo === "estimado" || c.tipo === "a_confirmar" ? "~ " : ""}
                {formatarCentavos(c.valor)}
              </span>
            </>
          );
          return (
            <li key={c.chave}>
              {c.href ? (
                <Link href={c.href} className="flex min-h-12 items-center gap-3 rounded-2xl px-1 active:bg-fundo">
                  {conteudo}
                </Link>
              ) : (
                <div className="flex min-h-12 items-center gap-3 px-1">{conteudo}</div>
              )}
            </li>
          );
        })}
      </ul>
      {itens.length > visiveis.length && (
        <p className="mt-2 text-xs text-tinta-suave">E mais {itens.length - visiveis.length} até o fim do mês.</p>
      )}
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
