"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
