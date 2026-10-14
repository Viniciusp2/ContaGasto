import Link from "next/link";
import { ChevronRight, Info, Sparkles, TrendingUp } from "lucide-react";
import { NumeroAnimado } from "@/components/animacoes";
import { formatarCentavos } from "@/lib/dinheiro";

type Plano = {
  livre: number;
  diasRestantes: number;
  porDia: number | null;
  porSemana: number | null;
  ritmoDiario: number;
  sobraNoFim: number;
  acabaNoDia: number | null;
};
type Pendente = { chave: string; descricao: string; valor: number; data: string; detalhe?: string };

const linha = "flex items-baseline justify-between gap-3";

// Disponível com base no dinheiro dos bancos (1.6.6): quanto dá pra gastar por dia e por semana até o fim do mês.
// Um toque abre a conta, o que falta pagar e o VA.
export function CartaoPlano({
  plano,
  nasContas,
  faltaPagar,
  guardadoObjetivos,
  va,
  pendentes,
}: {
  plano: Plano;
  nasContas: number;
  faltaPagar: number;
  guardadoObjetivos: number;
  va: number;
  pendentes: Pendente[];
}) {
  const semFolga = plano.porDia === null;
  return (
    <details className={`group rounded-card shadow-suave ${semFolga ? "bg-coral" : "bg-menta"}`}>
      <summary className="block cursor-pointer list-none p-5 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2 text-sm font-semibold">
          <span className="flex items-center gap-2">
            <Sparkles size={18} aria-hidden /> Disponível até o fim do mês
          </span>
          <Info size={16} aria-label="Como é calculado" />
        </span>
        <span className="mt-1 block text-3xl font-bold tabular-nums">
          <NumeroAnimado centavos={plano.livre} />
        </span>
        {semFolga ? (
          <span className="mt-2 block text-base font-semibold">Sem folga: falta pagar mais do que tem nos bancos</span>
        ) : (
          <span className="mt-2 grid grid-cols-2 gap-2">
            <span className="rounded-2xl bg-cartao/70 px-3 py-2">
              <span className="block text-xs">por dia</span>
              <span className="block text-lg font-bold tabular-nums">{formatarCentavos(plano.porDia ?? 0)}</span>
            </span>
            <span className="rounded-2xl bg-cartao/70 px-3 py-2">
              <span className="block text-xs">por semana</span>
              <span className="block text-lg font-bold tabular-nums">{formatarCentavos(plano.porSemana ?? 0)}</span>
            </span>
          </span>
        )}
        <span className="mt-2 block text-sm">
          {plano.diasRestantes === 1 ? "Último dia do mês" : `${plano.diasRestantes} dias até o fim do mês`}, já tirando o que falta pagar.{" "}
          <span className="underline">Toque pra ver.</span>
        </span>
      </summary>
      <div className="mx-3 mb-3 flex flex-col gap-2 rounded-2xl bg-cartao p-4 text-sm">
        <p className="font-semibold">Como chegamos nesse número</p>
        <p className={linha}>
          <span>Nas contas hoje (bancos, sem o VA)</span>
          <span className="tabular-nums">{formatarCentavos(nasContas)}</span>
        </p>
        <p className={linha}>
          <span>- O que ainda falta pagar este mês</span>
          <span className="tabular-nums">{formatarCentavos(faltaPagar)}</span>
        </p>
        {guardadoObjetivos !== 0 && (
          <p className={linha}>
            <span>- Guardado nos objetivos (já tem destino)</span>
            <span className="tabular-nums">{formatarCentavos(guardadoObjetivos)}</span>
          </p>
        )}
        <p className={`${linha} border-t border-fundo pt-2 font-bold`}>
          <span>= Livre até o fim do mês</span>
          <span className="tabular-nums">{formatarCentavos(plano.livre)}</span>
        </p>
        {!semFolga && (
          <p className="text-xs text-tinta-suave">
            Dividido pelos {plano.diasRestantes} dia{plano.diasRestantes === 1 ? "" : "s"} que faltam (contando hoje):{" "}
            {formatarCentavos(plano.porDia ?? 0)} por dia, {formatarCentavos(plano.porSemana ?? 0)} por semana. Gastando até isso, o dinheiro
            dura até o dia 31.
          </p>
        )}
        {va > 0 && (
          <p className={`${linha} rounded-2xl bg-fundo px-3 py-2`}>
            <span>Pra comida, no VA (à parte)</span>
            <span className="tabular-nums">
              {formatarCentavos(va)} · {formatarCentavos(Math.floor(va / plano.diasRestantes))}/dia
            </span>
          </p>
        )}

        {pendentes.length > 0 && (
          <>
            <p className="mt-2 font-semibold">O que ainda falta pagar</p>
            <ul className="flex flex-col gap-1">
              {pendentes.map((p) => (
                <li key={p.chave} className={linha}>
                  <span className="min-w-0 truncate">
                    {p.descricao}
                    <span className="text-xs text-tinta-suave">
                      {" "}
                      · {p.data.slice(8, 10)}/{p.data.slice(5, 7)}
                      {p.detalhe ? ` · ${p.detalhe}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">{formatarCentavos(p.valor)}</span>
                </li>
              ))}
            </ul>
            <Link href="/pagamentos" className="flex min-h-11 items-center gap-1 font-semibold underline">
              Ver e marcar como pago em Pagamentos <ChevronRight size={16} aria-hidden />
            </Link>
          </>
        )}
        <p className="rounded-2xl bg-fundo px-3 py-2 text-xs text-tinta-suave">
          Salário ou outra entrada que ainda não caiu não entra, pra não contar com dinheiro que não chegou. Se o valor dos bancos estiver
          diferente do app do banco, acerte em Mais, Conferir.
        </p>
      </div>
    </details>
  );
}

// Previsão pelo ritmo (1.6.6): no jeito que você está gastando no dia a dia, o dinheiro chega ao fim do mês?
export function CartaoRitmo({ plano, hojeDia }: { plano: Plano; hojeDia: number }) {
  const chega = plano.acabaNoDia === null;
  const gastoAteOFim = plano.ritmoDiario * plano.diasRestantes;
  return (
    <details className="group rounded-card bg-cartao shadow-suave">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className={`inline-flex rounded-full p-2 ${chega ? "bg-menta" : "bg-coral"}`}>
          <TrendingUp size={20} aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">Previsão no seu ritmo</span>
          <span className="block text-xs text-tinta-suave">
            {plano.ritmoDiario > 0 ? `Dia a dia de ${formatarCentavos(plano.ritmoDiario)} por dia` : "Sem gasto do dia a dia nos últimos 30 dias"}
          </span>
        </span>
        <span className="text-right text-sm font-bold">
          {chega ? (
            <>
              Dá até o fim
              <span className="block text-xs font-normal tabular-nums">sobram {formatarCentavos(plano.sobraNoFim)}</span>
            </>
          ) : (
            <>
              Acaba dia {plano.acabaNoDia}
              <span className="block text-xs font-normal">
                {(plano.acabaNoDia ?? 0) <= hojeDia ? "já não dá" : `faltam ${formatarCentavos(-plano.sobraNoFim)}`}
              </span>
            </>
          )}
        </span>
        <Info size={16} className="shrink-0 text-tinta-suave" aria-label="Como é calculado" />
      </summary>
      <div className="flex flex-col gap-2 border-t border-fundo px-4 pt-3 pb-4 text-sm">
        <p>
          O <strong>ritmo</strong> é a média do seu dia a dia nos últimos 30 dias: mercado, lanche, transporte, compras. Contas (luz, aluguel,
          faculdade, assinaturas) ficam de fora, porque já estão no &quot;falta pagar&quot;.
        </p>
        <p>
          Gastando {formatarCentavos(plano.ritmoDiario)} por dia nos {plano.diasRestantes} dia{plano.diasRestantes === 1 ? "" : "s"} que faltam, saem{" "}
          {formatarCentavos(gastoAteOFim)} dos {formatarCentavos(plano.livre)} livres.{" "}
          {chega
            ? `Sobram ${formatarCentavos(plano.sobraNoFim)} no fim do mês.`
            : `No ritmo de agora, o dinheiro livre acaba por volta do dia ${plano.acabaNoDia}. Pra chegar ao fim do mês, o limite é ${
                plano.porDia !== null ? `${formatarCentavos(plano.porDia)} por dia` : "zero (sem folga)"
              }.`}
        </p>
      </div>
    </details>
  );
}
