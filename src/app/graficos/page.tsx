import Link from "next/link";
import { ArrowLeft, CalendarRange, ChartColumn } from "lucide-react";
import { BarrasRanking } from "@/components/barras-ranking";
import { GraficoDivergente, GraficoFluxo, GraficoRitmo, GraficoSemana, VerEmTabela } from "@/components/graficos";
import { SeletorMes } from "@/components/seletor-mes";
import { lancamentosDoAno, lancamentosParaGraficos, listarTodasCategorias } from "@/db/consultas";
import { diasDeEntrada, quantoDura } from "@/lib/duracao";
import { gerarRecorrencias } from "@/db/gerar-recorrencias";
import { gastoPorCategoria } from "@/lib/calculos";
import { diasNoMes, hojeISO, lerMes, mesParaTexto, nomeDoMes, somarMeses } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";
import { comparacaoCategorias, fluxoDoMes, mapaDeCalor, maioresViloes, porBanco, porDiaDaSemana, porFormaPagamento, ritmoDoMes } from "@/lib/graficos";
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
  const mesAnterior = somarMeses(mes, -1);
  const [lancamentos, categorias, doAno, anteriores] = await Promise.all([
    lancamentosParaGraficos(mes),
    listarTodasCategorias(),
    lancamentosDoAno(mes.ano),
    lancamentosParaGraficos(mesAnterior),
  ]);
  const nomesCategorias = new Map(categorias.map((c) => [c.id, c.nome]));

  const fluxo = fluxoDoMes(lancamentos, mes, ateDia);
  const viloes = maioresViloes(gastoPorCategoria(lancamentos), nomesCategorias);
  // Comparação com o mês passado: ritmo do gasto e as categorias que mais mudaram
  const ritmo = ritmoDoMes(lancamentos, anteriores, mes, mesAnterior, Math.max(ateDia, 0));
  const temAnterior = anteriores.length > 0;
  const mudancas = comparacaoCategorias(gastoPorCategoria(lancamentos), gastoPorCategoria(anteriores), nomesCategorias);
  const bancos = porBanco(lancamentos);
  const formas = porFormaPagamento(lancamentos);
  const semana = porDiaDaSemana(lancamentos);
  const calor = mapaDeCalor(lancamentos, mes);
  const temGasto = viloes.length > 0;
  // Dias do salário e do VA no mapa, e quanto cada um costuma durar (média do ano)
  const marcados = Object.fromEntries(diasDeEntrada(lancamentos));
  const referencia = mes.ano === Number(hoje.slice(0, 4)) ? hoje : `${mes.ano}-12-31`;
  const mediaSalario = quantoDura(doAno, "salario", referencia).mediaDias;
  const mediaVA = quantoDura(doAno, "va", referencia).mediaDias;
  const duracoes = [
    mediaSalario !== null ? `o salário acaba em ${mediaSalario} dias` : null,
    mediaVA !== null ? `o VA em ${mediaVA} dias` : null,
  ].filter(Boolean);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link href="/mais" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave">
          <ArrowLeft size={16} aria-hidden /> Mais
        </Link>
        <h1 className="text-2xl font-bold">Gráficos</h1>
      </div>
      <SeletorMes mes={mes} href={(m) => `/graficos?mes=${m}`} />
      <Link
        href={`/resumo?ano=${mes.ano}`}
        className="flex min-h-11 items-center justify-center gap-2 self-center rounded-full bg-cartao px-4 text-sm font-semibold shadow-suave"
      >
        <CalendarRange size={16} aria-hidden /> Ver o ano de {mes.ano}
      </Link>

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
              {temAnterior && ateDia > 0 && (
                <Cartao titulo="Ritmo do mês" dica={`Gasto acumulado dia a dia, comparado com ${nomeDoMes(mesAnterior)}`}>
                  <GraficoRitmo pontos={ritmo} />
                </Cartao>
              )}

              {temAnterior && mudancas.length > 0 && (
                <Cartao titulo="Comparado ao mês passado" dica="Categorias que mais subiram (vermelho) ou caíram (verde)">
                  <GraficoDivergente
                    itens={mudancas.map((m) => ({ rotulo: m.nome, valor: m.diferenca }))}
                    positivoEhBom={false}
                    descricao={`Categorias que mais mudaram em relação ao mês passado: ${mudancas.map((m) => `${m.nome} ${m.diferenca > 0 ? "subiu" : "caiu"} ${formatarCentavos(Math.abs(m.diferenca))}`).join(", ")}`}
                  />
                </Cartao>
              )}

              <Cartao titulo="Maiores vilões" dica="Onde mais foi dinheiro">
                <BarrasRanking itens={viloes} estado="gasto" />
              </Cartao>

              <Cartao titulo="Por forma de pagamento" dica="Como você pagou os gastos">
                <BarrasRanking itens={formas} estado="dado" mostrarPorcentagem />
                <VerEmTabela
                  linhas={formas.map((f) => [f.nome, `${formatarCentavos(f.valor)} (${Math.round(f.fracao * 100)}%)`])}
                />
              </Cartao>

              {bancos.length > 1 && (
                <Cartao titulo="Por banco" dica="De onde saiu o dinheiro (inclui o que foi pago com o VA)">
                  <BarrasRanking itens={bancos} estado="dado" mostrarPorcentagem />
                </Cartao>
              )}

              <Cartao titulo="Por dia da semana" dica="Em que dia você mais gasta">
                <GraficoSemana dias={semana} />
              </Cartao>

              <Cartao titulo="Mapa de calor" dica="Quanto mais escuro, mais você gastou no dia">
                <MapaDeCalor dias={calor.dias} vazias={calor.vazias} hoje={hoje} marcados={marcados} />
                {duracoes.length > 0 && (
                  <p className="mt-3 rounded-2xl bg-fundo px-3 py-2 text-sm">
                    Em média, {duracoes.join(" e ")}.{" "}
                    <Link href={`/resumo?ano=${mes.ano}`} className="font-semibold underline">
                      Ver cada mês
                    </Link>
                  </p>
                )}
              </Cartao>
            </>
          )}
        </div>
      )}
    </section>
  );
}
