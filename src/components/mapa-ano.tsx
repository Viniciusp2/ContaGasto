import { classeMarcado, LegendaEntradas, NIVEIS, textoMarcado, type Marcados } from "@/components/mapa-calor";
import { MESES_CURTOS } from "@/lib/analise-ano";
import { diaCurto } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";

type Mes = { mes: number; vazias: number; dias: { dia: number; data: string; valor: number; nivel: number }[] };

// Mapa de calor do ano: um calendário pequeno por mês (3 por linha no celular). Mesma escala coral do mês.
export function MapaDoAno({ meses, hoje, marcados }: { meses: Mes[]; hoje: string; marcados: Marcados }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4">
        {meses.map((m) => {
          const total = m.dias.reduce((s, d) => s + d.valor, 0);
          const entradas = m.dias.filter((d) => marcados[d.data]).length;
          return (
            <div key={m.mes} role="img" aria-label={`${MESES_CURTOS[m.mes - 1]}: gasto de ${formatarCentavos(total)}${entradas ? `, ${entradas} dia(s) de salário ou VA` : ""}`}>
              <p className="mb-1 text-xs font-semibold capitalize">{MESES_CURTOS[m.mes - 1]}</p>
              <div className="grid grid-cols-7 gap-[3px]" aria-hidden>
                {Array.from({ length: m.vazias }, (_, i) => (
                  <span key={`v${i}`} />
                ))}
                {m.dias.map((d) => {
                  const marca = marcados[d.data];
                  const extra = textoMarcado(marca);
                  return (
                    <span
                      key={d.dia}
                      title={`${diaCurto(d.data)}: ${formatarCentavos(d.valor)}${extra ? `, ${extra}` : ""}`}
                      className={`aspect-square rounded-[3px] ${classeMarcado(marca).replace("outline-offset-1", "outline-offset-0")} ${
                        d.data > hoje ? "opacity-30" : ""
                      }`}
                      style={{ backgroundColor: NIVEIS[d.nivel].fundo }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <LegendaEntradas />
      <div className="mt-2 flex items-center justify-end gap-1 text-xs text-tinta-suave" aria-hidden>
        menos
        {NIVEIS.map((n, i) => (
          <span key={i} className="size-3.5 rounded" style={{ backgroundColor: n.fundo }} />
        ))}
        mais
      </div>
    </>
  );
}
