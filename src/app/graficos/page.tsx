import Link from "next/link";
import { ArrowLeft, ChartColumn } from "lucide-react";
import { BarrasRanking } from "@/components/barras-ranking";
import { COR_GRAFICO, GraficoFluxo, GraficoSemana, VerEmTabela } from "@/components/graficos";
import { SeletorMes } from "@/components/seletor-mes";
import { lancamentosParaGraficos, listarTodasCategorias } from "@/db/consultas";
import { gerarRecorrencias } from "@/db/gerar-recorrencias";
import { gastoPorCategoria } from "@/lib/calculos";
import { diasNoMes, hojeISO, lerMes, mesParaTexto } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";
import { fluxoDoMes, mapaDeCalor, maioresViloes, porDiaDaSemana, porFormaPagamento } from "@/lib/graficos";
import { MapaDeCalor } from "@/components/mapa-calor";

export const dynamic = "force-dynamic";

function Cartao({ titulo, dica, children }: { titulo: string; dica: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card bg-cartao p-4 shadow-suave">
      <h2 className="font-bold">{titulo}</h2>
      <p className="mb-3 text-sm text-tinta-suave">{dica}</p>
      {children}
    </section>
  );
}

export default async function Graficos({ searchParams }: PageProps<"/graficos">) {
  await gerarRecorrencias();
  const params = await searchParams;
  const mes = lerMes(typeof params.mes === "string" ? params.mes : undefined);
  const hoje = hojeISO();
  const texto = mesParaTexto(mes);

  // Mês atual vai até hoje; mês futuro ainda não tem fluxo
  const ateDia = texto === hoje.slice(0, 7) ? Number(hoje.slice(8, 10)) : texto > hoje.slice(0, 7) ? 0 : diasNoMes(mes);
  const [lancamentos, categorias] = await Promise.all([lancamentosParaGraficos(mes), listarTodasCategorias()]);

  const fluxo = fluxoDoMes(lancamentos, mes, ateDia);
  const viloes = maioresViloes(gastoPorCategoria(lancamentos), new Map(categorias.map((c) => [c.id, c.nome])));
  const formas = porFormaPagamento(lancamentos);
  const semana = porDiaDaSemana(lancamentos);
  const calor = mapaDeCalor(lancamentos, mes);
  const temGasto = viloes.length > 0;

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link href="/mais" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave">
          <ArrowLeft size={16} aria-hidden /> Mais
        </Link>
        <h1 className="text-2xl font-bold">Gráficos</h1>
      </div>
      <SeletorMes mes={mes} href={(m) => `/graficos?mes=${m}`} />

      {!temGasto && fluxo.every((p) => p.saldo === 0) ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-cartao p-8 text-center shadow-suave">
          <span className="rounded-full bg-lavanda p-4">
            <ChartColumn size={28} aria-hidden />
          </span>
          <p className="text-tinta-suave">Nada lançado nesse mês ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {fluxo.length > 0 && (
            <Cartao titulo="Fluxo do mês" dica="Quanto sobrou até cada dia (entradas menos gastos)">
              <GraficoFluxo pontos={fluxo} />
            </Cartao>
          )}

          {temGasto && (
            <>
              <Cartao titulo="Maiores vilões" dica="Onde mais foi dinheiro">
                <BarrasRanking itens={viloes} cor={COR_GRAFICO.gasto} />
              </Cartao>

              <Cartao titulo="Por forma de pagamento" dica="Como você pagou os gastos">
                <BarrasRanking itens={formas} cor={COR_GRAFICO.neutro} mostrarPorcentagem />
                <VerEmTabela
                  linhas={formas.map((f) => [f.nome, `${formatarCentavos(f.valor)} (${Math.round(f.fracao * 100)}%)`])}
                />
              </Cartao>

              <Cartao titulo="Por dia da semana" dica="Em que dia você mais gasta">
                <GraficoSemana dias={semana} />
              </Cartao>

              <Cartao titulo="Mapa de calor" dica="Quanto mais escuro, mais você gastou no dia">
                <MapaDeCalor dias={calor.dias} vazias={calor.vazias} hoje={hoje} />
              </Cartao>
            </>
          )}
        </div>
      )}
    </section>
  );
}
