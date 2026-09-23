"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatarCentavos } from "@/lib/dinheiro";

// Tons escuros da paleta, só pras marcas dos gráficos (validados: contraste >= 3:1 no cartão branco)
export const COR_GRAFICO = { gasto: "#D9622B", positivo: "#1B8F6E", neutro: "#7B4FA8" } as const;
const TINTA_SUAVE = "#6B5A72";
const GRADE = "#EFE6F2";

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
      <div className="h-52" role="img" aria-label={`Saldo acumulado do dia 1 ao dia ${pontos.length}, terminando em ${formatarCentavos(pontos.at(-1)!.saldo)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={pontos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="preenchimentoFluxo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={cor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={GRADE} />
            <XAxis dataKey="dia" tick={{ fill: TINTA_SUAVE, fontSize: 12 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
            <YAxis tickFormatter={eixoReais} tick={{ fill: TINTA_SUAVE, fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
            {negativo && <ReferenceLine y={0} stroke={TINTA_SUAVE} strokeDasharray="4 4" />}
            <Tooltip
              cursor={{ stroke: TINTA_SUAVE, strokeWidth: 1 }}
              content={({ active, payload, label }) => (
                <DicaValor active={active} payload={payload} rotulo={`Dia ${label}`} />
              )}
            />
            <Area type="monotone" dataKey="saldo" stroke={cor} strokeWidth={2} fill="url(#preenchimentoFluxo)" activeDot={{ r: 5 }} />
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
      <div className="h-44" role="img" aria-label={`Gasto por dia da semana. Dia que mais gasta: ${maior.dia}, ${formatarCentavos(maior.valor)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dias} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRADE} />
            <XAxis dataKey="dia" tick={{ fill: TINTA_SUAVE, fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={eixoReais} tick={{ fill: TINTA_SUAVE, fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
            <Tooltip
              cursor={{ fill: GRADE }}
              content={({ active, payload, label }) => (
                <DicaValor active={active} payload={payload} rotulo={String(label)} />
              )}
            />
            <Bar dataKey="valor" fill={COR_GRAFICO.gasto} radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <VerEmTabela linhas={dias.map((d) => [d.dia, formatarCentavos(d.valor)])} />
    </>
  );
}
