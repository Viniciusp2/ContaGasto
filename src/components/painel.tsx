import Link from "next/link";
import { ChevronRight, Sparkles, Info, TrendingUp, Tv } from "lucide-react";
import { formatarCentavos } from "@/lib/dinheiro";
import { NumeroAnimado } from "@/components/animacoes";

// Destaque do Início: quanto dá pra gastar sem comprometer o que já tem destino.
// Um toque abre a conta e a lista do que ainda falta pagar (pedido em 07/10/2026).
type Pendente = { chave: string; descricao: string; valor: number; data: string; detalhe?: string };

export function CartaoDisponivel({
  disponivel,
  porDia,
  diasRestantes,
  guardado,
  compromissos,
  sobrouNoMes,
  pendentes,
}: {
  disponivel: number;
  porDia: number | null;
  diasRestantes: number;
  guardado: number;
  compromissos: number;
  sobrouNoMes: number;
  pendentes: Pendente[];
}) {
  const semFolga = porDia === null;
  const linha = "flex items-baseline justify-between gap-3";
  return (
    <details className={`group rounded-card shadow-suave ${semFolga ? "bg-coral" : "bg-menta"}`}>
      <summary className="block cursor-pointer list-none p-5 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2 text-sm font-semibold">
          <span className="flex items-center gap-2">
            <Sparkles size={18} aria-hidden /> Disponível para gastar
          </span>
          <Info size={16} aria-label="Como é calculado" />
        </span>
        <span className="mt-1 block text-3xl font-bold tabular-nums">
          <NumeroAnimado centavos={disponivel} />
        </span>
        <span className="mt-2 block text-base font-semibold">
          {semFolga ? "Sem folga até o fim do mês" : `Dá pra gastar ${formatarCentavos(porDia)} por dia`}
          <span className="font-normal"> · {diasRestantes === 1 ? "último dia" : `${diasRestantes} dias`}</span>
        </span>
        <span className="mt-1 block text-sm">
          Já desconta {formatarCentavos(compromissos)} que ainda falta pagar
          {guardado !== 0 ? ` e ${formatarCentavos(guardado)} guardados no mês` : ""}. <span className="underline">Toque pra ver.</span>
        </span>
      </summary>
      <div className="mx-3 mb-3 flex flex-col gap-2 rounded-2xl bg-cartao p-4 text-sm">
        <p className="font-semibold">Como chegamos nesse número</p>
        <p className={linha}>
          <span>Sobrou no mês até agora (entradas menos gastos)</span>
          <span className="tabular-nums">{formatarCentavos(sobrouNoMes)}</span>
        </p>
        {guardado !== 0 && (
          <p className={linha}>
            <span>- Guardado nos objetivos este mês</span>
            <span className="tabular-nums">{formatarCentavos(guardado)}</span>
          </p>
        )}
        <p className={linha}>
          <span>- O que ainda falta pagar este mês</span>
          <span className="tabular-nums">{formatarCentavos(compromissos)}</span>
        </p>
        <p className={`${linha} border-t border-fundo pt-2 font-bold`}>
          <span>= Disponível para gastar</span>
          <span className="tabular-nums">{formatarCentavos(disponivel)}</span>
        </p>
        {!semFolga && (
          <p className="text-xs text-tinta-suave">
            Dividido pelos {diasRestantes} dia{diasRestantes === 1 ? "" : "s"} que faltam (contando hoje) dá {formatarCentavos(porDia)} por dia.
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
          O disponível parte do que sobrou <strong>neste mês</strong>, não do saldo do banco: dinheiro que sobrou de meses
          anteriores fica de fora, por segurança. Contas atrasadas e as que ainda vão vencer entram no &quot;falta pagar&quot;; salário
          que ainda não caiu não entra. Quanto tem nos bancos agora está em &quot;Nas contas hoje&quot;.
        </p>
      </div>
    </details>
  );
}

// Previsão do mês. Um toque abre a conta, em linguagem simples, pra o número não assustar.
export function CartaoPrevisao({
  partes,
  entradas,
}: {
  partes: { jaSaiu: number; aindaVaiCair: number; ritmoDiario: number; diasQueFaltam: number; diaADia: number; total: number };
  entradas: number;
}) {
  const sobra = entradas - partes.total;
  const linha = "flex items-baseline justify-between gap-3";
  return (
    <details className="group rounded-card bg-cartao shadow-suave">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex rounded-full bg-limao p-2">
          <TrendingUp size={20} aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">Previsão de gasto no mês</span>
          <span className="block text-xs text-tinta-suave">
            {sobra >= 0 ? `Deve sobrar ${formatarCentavos(sobra)}` : `Deve faltar ${formatarCentavos(-sobra)}`} com o que já entrou
          </span>
        </span>
        <span className="text-lg font-bold tabular-nums">{formatarCentavos(partes.total)}</span>
        <Info size={16} className="shrink-0 text-tinta-suave" aria-label="Como é calculado" />
      </summary>
      <div className="flex flex-col gap-2 border-t border-fundo px-4 pt-3 pb-4 text-sm">
        <p className="font-semibold">Como chegamos nesse número</p>
        <p className={linha}>
          <span>Já saiu este mês</span>
          <span className="tabular-nums">{formatarCentavos(partes.jaSaiu)}</span>
        </p>
        <p className={linha}>
          <span>+ Contas e parcelas que ainda vão cair</span>
          <span className="tabular-nums">{formatarCentavos(partes.aindaVaiCair)}</span>
        </p>
        <p className={linha}>
          <span>
            + Seu dia a dia: {formatarCentavos(partes.ritmoDiario)} por dia x {partes.diasQueFaltam} dia{partes.diasQueFaltam === 1 ? "" : "s"} que faltam
          </span>
          <span className="tabular-nums">{formatarCentavos(partes.diaADia)}</span>
        </p>
        <p className={`${linha} border-t border-fundo pt-2 font-bold`}>
          <span>= Previsão</span>
          <span className="tabular-nums">{formatarCentavos(partes.total)}</span>
        </p>
        <p className="rounded-2xl bg-fundo px-3 py-2 text-xs text-tinta-suave">
          É uma estimativa, não uma conta a pagar. O &quot;dia a dia&quot; é a média dos gastos avulsos até hoje (mercado, lanche, 99...);
          aluguel e contas fixas entram uma vez só, nunca multiplicados. Se você gastar menos nos próximos dias, a previsão cai.
          O &quot;deve sobrar&quot; compara com o que já entrou: salário que ainda vai cair não conta, pra não contar com dinheiro que não chegou.
        </p>
      </div>
    </details>
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
