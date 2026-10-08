"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COR_GRAFICO } from "@/lib/cores-grafico";
import { formatarCentavos } from "@/lib/dinheiro";

// No SVG, a série usa currentColor e a cor vem do "color" do contêiner (cores em lib/cores-grafico).
const EIXO = { fontSize: 12 };

const compacto = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" });
const eixoReais = (centavos: number) => compacto.format(centavos / 100);

function DicaValor({
  active,
  payload,
  rotulo,
}: {
  active?: boolean;
  payload?: readonly { value?: unknown }[];
  rotulo: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl bg-cartao px-3 py-2 text-sm shadow-suave">
      <p className="text-tinta-suave">{rotulo}</p>
      <p className="font-bold tabular-nums">{formatarCentavos(Number(payload[0].value))}</p>
    </div>
  );
}

// Tabela escondida atrás de um toque: acesso aos números sem depender do desenho
export function VerEmTabela({ linhas }: { linhas: [string, string][] }) {
  return (
    <details className="mt-2 text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center text-tinta-suave">Ver em tabela</summary>
      <table className="w-full">
        <tbody>
          {linhas.map(([a, b]) => (
            <tr key={a} className="border-t border-fundo">
              <td className="py-1">{a}</td>
              <td className="py-1 text-right tabular-nums">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function GraficoFluxo({ pontos }: { pontos: { dia: number; saldo: number }[] }) {
  const negativo = pontos.some((p) => p.saldo < 0);
  const cor = pontos.at(-1)!.saldo < 0 ? COR_GRAFICO.gasto : COR_GRAFICO.positivo;
  return (
    <>
      <div className="h-52" style={{ color: cor }} role="img" aria-label={`Saldo acumulado do dia 1 ao dia ${pontos.length}, terminando em ${formatarCentavos(pontos.at(-1)!.saldo)}`}>
        <ResponsiveContainer width="100%" height="100%">
          {/* accessibilityLayer desligado: ao tocar, o celular desenhava uma moldura preta de foco. A leitura acessível já vem do aria-label e da tabela. */}
          <AreaChart data={pontos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer={false}>
            <defs>
              <linearGradient id="preenchimentoFluxo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="dia" tick={EIXO} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
            <YAxis tickFormatter={eixoReais} tick={EIXO} axisLine={false} tickLine={false} width={70} />
            {negativo && <ReferenceLine y={0} strokeDasharray="4 4" />}
            <Tooltip
              cursor={{ strokeWidth: 1 }}
              content={({ active, payload, label }) => (
                <DicaValor active={active} payload={payload} rotulo={`Dia ${label}`} />
              )}
            />
            <Area type="monotone" dataKey="saldo" stroke="currentColor" strokeWidth={2} fill="url(#preenchimentoFluxo)" activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <VerEmTabela linhas={pontos.map((p) => [`Dia ${p.dia}`, formatarCentavos(p.saldo)])} />
    </>
  );
}

export function GraficoSemana({ dias }: { dias: { dia: string; valor: number }[] }) {
  const maior = dias.reduce((a, b) => (b.valor > a.valor ? b : a));
  return (
    <>
      <div className="h-44" style={{ color: COR_GRAFICO.gasto }} role="img" aria-label={`Gasto por dia da semana. Dia que mais gasta: ${maior.dia}, ${formatarCentavos(maior.valor)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dias} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer={false}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="dia" tick={EIXO} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={eixoReais} tick={EIXO} axisLine={false} tickLine={false} width={70} />
            <Tooltip
              cursor
              content={({ active, payload, label }) => (
                <DicaValor active={active} payload={payload} rotulo={String(label)} />
              )}
            />
            <Bar dataKey="valor" fill="currentColor" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <VerEmTabela linhas={dias.map((d) => [d.dia, formatarCentavos(d.valor)])} />
    </>
  );
}

// Gasto mês a mês no ano. Só o mês mais caro ganha o valor escrito em cima (rótulo seletivo).
export function GraficoMeses({ meses, emAndamento }: { meses: { mes: number; rotulo: string; gasto: number }[]; emAndamento?: number }) {
  const maior = meses.reduce((a, b) => (b.gasto > a.gasto ? b : a));
  return (
    <>
      <div
        className="h-52"
        style={{ color: COR_GRAFICO.gasto }}
        role="img"
        aria-label={`Gasto por mês. Mês mais caro: ${maior.rotulo}, ${formatarCentavos(maior.gasto)}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={meses} margin={{ top: 22, right: 8, left: 0, bottom: 0 }} accessibilityLayer={false}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="rotulo" tick={EIXO} axisLine={false} tickLine={false} interval={0} />
            <YAxis tickFormatter={eixoReais} tick={EIXO} axisLine={false} tickLine={false} width={70} />
            <Tooltip
              cursor
              content={({ active, payload, label }) => (
                <DicaValor active={active} payload={payload} rotulo={`${label}${meses.find((m) => m.rotulo === label)?.mes === emAndamento ? " (em andamento)" : ""}`} />
              )}
            />
            <Bar dataKey="gasto" fill="currentColor" radius={[4, 4, 0, 0]} maxBarSize={28} animationDuration={700}>
              <LabelList
                dataKey="gasto"
                position="top"
                content={({ x, y, width, value, index }) =>
                  index === meses.indexOf(maior) && Number(value) > 0 ? (
                    <text x={Number(x) + Number(width) / 2} y={Number(y) - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--tinta)">
                      {eixoReais(Number(value))}
                    </text>
                  ) : null
                }
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <VerEmTabela linhas={meses.map((m) => [m.rotulo + (m.mes === emAndamento ? " (em andamento)" : ""), formatarCentavos(m.gasto)])} />
    </>
  );
}

// Ritmo do mês: duas linhas no mesmo eixo (este mês x mês passado). Legenda sempre; o mês passado é tracejado,
// então a diferença não depende só da cor.
export function GraficoRitmo({ pontos }: { pontos: { dia: number; atual: number | null; anterior: number | null }[] }) {
  const ultimoAtual = [...pontos].reverse().find((p) => p.atual !== null);
  const mesmoDiaAnterior = ultimoAtual ? pontos[ultimoAtual.dia - 1]?.anterior : null;
  return (
    <>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-tinta-suave">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded" style={{ backgroundColor: COR_GRAFICO.gasto }} aria-hidden /> este mês
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 border-t-2 border-dashed" style={{ borderColor: COR_GRAFICO.neutro }} aria-hidden /> mês passado
        </span>
      </div>
      <div
        className="h-52"
        role="img"
        aria-label={
          ultimoAtual
            ? `Até o dia ${ultimoAtual.dia}, você gastou ${formatarCentavos(ultimoAtual.atual!)} este mês${mesmoDiaAnterior !== null && mesmoDiaAnterior !== undefined ? ` e ${formatarCentavos(mesmoDiaAnterior)} no mesmo dia do mês passado` : ""}`
            : "Ritmo do mês"
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pontos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer={false}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="dia" tick={EIXO} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
            <YAxis tickFormatter={eixoReais} tick={EIXO} axisLine={false} tickLine={false} width={70} />
            <Tooltip
              cursor={{ strokeWidth: 1 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-2xl bg-cartao px-3 py-2 text-sm shadow-suave">
                    <p className="text-tinta-suave">Até o dia {label}</p>
                    {payload.map((p) =>
                      p.value === null || p.value === undefined ? null : (
                        <p key={String(p.dataKey)} className="tabular-nums">
                          {p.dataKey === "atual" ? "Este mês" : "Mês passado"}: <strong>{formatarCentavos(Number(p.value))}</strong>
                        </p>
                      ),
                    )}
                  </div>
                ) : null
              }
            />
            <Line type="monotone" dataKey="anterior" stroke={COR_GRAFICO.neutro} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} animationDuration={700} />
            <Line type="monotone" dataKey="atual" stroke={COR_GRAFICO.gasto} strokeWidth={2} dot={false} activeDot={{ r: 5 }} connectNulls={false} animationDuration={900} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <VerEmTabela
        linhas={pontos
          .filter((p) => p.atual !== null || p.anterior !== null)
          .map((p) => [`Dia ${p.dia}`, `${p.atual !== null ? formatarCentavos(p.atual) : "-"} / ${p.anterior !== null ? formatarCentavos(p.anterior) : "-"}`])}
      />
    </>
  );
}

// Barras pra direita e pra esquerda do zero (mais/menos). "positivoEhBom": sobra positiva é boa (verde);
// gasto que subiu é ruim (coral). O sinal + / - vai escrito no valor, então a cor nunca é a única pista.
export function GraficoDivergente({
  itens,
  positivoEhBom,
  descricao,
}: {
  itens: { rotulo: string; valor: number }[];
  positivoEhBom: boolean;
  descricao: string;
}) {
  const cor = (v: number) => ((v >= 0) === positivoEhBom ? COR_GRAFICO.positivo : COR_GRAFICO.gasto);
  const sinal = (v: number) => `${v > 0 ? "+" : v < 0 ? "-" : ""}${eixoReais(Math.abs(v))}`;
  return (
    <>
      <div style={{ height: Math.max(120, itens.length * 34 + 24) }} role="img" aria-label={descricao}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={itens} layout="vertical" margin={{ top: 4, right: 56, left: 0, bottom: 4 }} accessibilityLayer={false}>
            <XAxis type="number" hide domain={["dataMin", "dataMax"]} />
            <YAxis type="category" dataKey="rotulo" tick={EIXO} axisLine={false} tickLine={false} width={96} />
            <ReferenceLine x={0} />
            <Tooltip
              cursor
              content={({ active, payload, label }) => <DicaValor active={active} payload={payload} rotulo={String(label)} />}
            />
            <Bar dataKey="valor" radius={4} maxBarSize={20} animationDuration={700}>
              {itens.map((i) => (
                <Cell key={i.rotulo} fill={cor(i.valor)} />
              ))}
              <LabelList
                dataKey="valor"
                content={({ x, y, width, height, value }) => {
                  const v = Number(value);
                  const fim = Number(x) + Number(width);
                  const direita = Math.max(Number(x), fim);
                  return (
                    <text x={direita + 6} y={Number(y) + Number(height) / 2} dominantBaseline="middle" fontSize={11} fontWeight={700} fill="var(--tinta)">
                      {sinal(v)}
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <VerEmTabela linhas={itens.map((i) => [i.rotulo, `${i.valor > 0 ? "+" : ""}${formatarCentavos(i.valor)}`])} />
    </>
  );
}
