import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { BarraProgresso } from "@/components/barra-progresso";
import { ContaPagamento } from "@/components/conta-pagamento";
import { SeletorMes } from "@/components/seletor-mes";
import { gerarRecorrencias } from "@/db/gerar-recorrencias";
import { contasDoMes } from "@/db/pagamentos";
import { resumoPagamentos } from "@/lib/contas";
import { hojeISO, intervaloDoMes, lerMes } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";

export const dynamic = "force-dynamic";

export default async function Pagamentos({ searchParams }: PageProps<"/pagamentos">) {
  await gerarRecorrencias();
  const params = await searchParams;
  const mes = lerMes(typeof params.mes === "string" ? params.mes : undefined);
  const hoje = hojeISO();
  const contas = await contasDoMes(mes, hoje);
  const resumo = resumoPagamentos(contas);
  const { inicio } = intervaloDoMes(mes);

  // Atrasadas primeiro (inclusive de meses anteriores), depois o que falta e por último o que já foi
  const atrasadas = contas.filter((c) => !c.paga && !c.automatico && c.vencimento < hoje);
  const aPagar = contas.filter((c) => !c.paga && !atrasadas.includes(c));
  const pagas = contas.filter((c) => c.paga);
  const deMesesAntes = atrasadas.filter((c) => c.vencimento < inicio);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Pagamentos do mês</h1>
        <p className="text-sm text-tinta-suave">
          O que você tem que pagar. Só sai do saldo quando você marca Paguei.
        </p>
      </div>

      <SeletorMes mes={mes} href={(m) => `/pagamentos?mes=${m}`} />

      {contas.length > 0 && (
        <div className="flex flex-col gap-3 rounded-card bg-cartao p-4 shadow-suave">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-tinta-suave">Total</p>
              <p className="font-bold tabular-nums">{formatarCentavos(resumo.total)}</p>
            </div>
            <div>
              <p className="text-xs text-tinta-suave">Já paguei</p>
              <p className="font-bold tabular-nums">{formatarCentavos(resumo.pago)}</p>
            </div>
            <div>
              <p className="text-xs text-tinta-suave">Falta</p>
              <p className="font-bold tabular-nums">{formatarCentavos(resumo.falta)}</p>
            </div>
          </div>
          <BarraProgresso
            fracao={resumo.total > 0 ? resumo.pago / resumo.total : 0}
            estado={atrasadas.length > 0 ? "atencao" : "ok"}
            rotulo={`${resumo.pagas} de ${resumo.quantas} contas pagas`}
          />
          <p className="text-center text-sm text-tinta-suave">
            {resumo.pagas} de {resumo.quantas} contas pagas
            {atrasadas.length > 0 ? `, ${atrasadas.length} atrasada${atrasadas.length > 1 ? "s" : ""}` : ""}
          </p>
        </div>
      )}

      {contas.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-card bg-cartao p-8 text-center shadow-suave">
          <span className="rounded-full bg-lavanda p-4">
            <Receipt size={28} aria-hidden />
          </span>
          <p className="text-tinta-suave">
            Nenhuma conta nesse mês. Cadastre aluguel, luz, internet e o que mais você paga todo mês.
          </p>
        </div>
      )}

      {atrasadas.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Atrasadas</h2>
          {deMesesAntes.length > 0 && (
            <p className="rounded-2xl bg-coral px-3 py-2 text-sm">
              Tem {deMesesAntes.length} conta{deMesesAntes.length > 1 ? "s" : ""} de meses anteriores sem pagar. Elas continuam aqui até você pagar.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {atrasadas.map((c) => (
              <ContaPagamento key={c.chave} conta={c} hoje={hoje} />
            ))}
          </ul>
        </section>
      )}

      {aPagar.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">A pagar</h2>
          <ul className="flex flex-col gap-2">
            {aPagar.map((c) => (
              <ContaPagamento key={c.chave} conta={c} hoje={hoje} />
            ))}
          </ul>
        </section>
      )}

      {pagas.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Pagas</h2>
          <ul className="flex flex-col gap-2">
            {pagas.map((c) => (
              <ContaPagamento key={c.chave} conta={c} hoje={hoje} />
            ))}
          </ul>
        </section>
      )}

      <Link
        href="/lancamentos/novo?conta=1"
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-lavanda font-semibold"
      >
        <Plus size={18} aria-hidden /> Nova conta
      </Link>
      <p className="text-center text-xs text-tinta-suave">
        Conta do cartão de crédito entra sozinha na fatura. Pra mudar ou encerrar uma conta, vá em Mais, Fixos e parcelas.
      </p>
    </section>
  );
}
