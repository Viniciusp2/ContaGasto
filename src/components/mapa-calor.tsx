import { VerEmTabela } from "@/components/graficos";
import { diaCurto } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";

export { NIVEIS };

// Escala sequencial de um tom (coral), validada: clara -> escura, com número legível em cada casa
const NIVEIS = [
  { fundo: "var(--fundo)", texto: "var(--tinta-suave)" },
  { fundo: "#F29E72", texto: "var(--tinta)" },
  { fundo: "#E8845A", texto: "var(--tinta)" },
  { fundo: "#BF4F1E", texto: "#FFFFFF" },
  { fundo: "#9E3E16", texto: "#FFFFFF" },
];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

export type Marcados = Record<string, { salario: boolean; va: boolean }>;

// Dia em que caiu o salário: rodeado de verde (contínuo). Dia do VA: verde tracejado.
export function classeMarcado(m?: { salario: boolean; va: boolean }) {
  if (m?.salario) return "outline-2 outline-offset-1 outline-solid outline-[var(--grafico-positivo)]";
  if (m?.va) return "outline-2 outline-offset-1 outline-dashed outline-[var(--grafico-positivo)]";
  return "";
}

export function textoMarcado(m?: { salario: boolean; va: boolean }) {
  return [m?.salario ? "caiu o salário" : null, m?.va ? "caiu o VA" : null].filter(Boolean).join(" e ");
}

export function LegendaEntradas() {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tinta-suave">
      <span className="flex items-center gap-1.5">
        <span className={`inline-block size-3.5 rounded ${classeMarcado({ salario: true, va: false })}`} aria-hidden /> dia do salário
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`inline-block size-3.5 rounded ${classeMarcado({ salario: false, va: true })}`} aria-hidden /> dia do VA
      </span>
    </p>
  );
}

export function MapaDeCalor({
  dias,
  vazias,
  hoje,
  marcados = {},
}: {
  dias: { dia: number; data: string; valor: number; nivel: number }[];
  vazias: number;
  hoje: string;
  marcados?: Marcados;
}) {
  return (
    <>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {SEMANA.map((d, i) => (
          <span key={i} className="pb-1 text-tinta-suave" aria-hidden>
            {d}
          </span>
        ))}
        {Array.from({ length: vazias }, (_, i) => (
          <span key={`v${i}`} aria-hidden />
        ))}
        {dias.map((d) => {
          const futuro = d.data > hoje;
          const n = NIVEIS[d.nivel];
          const m = marcados[d.data];
          const extra = textoMarcado(m);
          const rotulo = `${diaCurto(d.data)}: ${formatarCentavos(d.valor)}${extra ? `, ${extra}` : ""}`;
          return (
            <span
              key={d.dia}
              title={rotulo}
              aria-label={rotulo}
              className={`flex aspect-square items-center justify-center rounded-lg font-semibold tabular-nums ${
                m ? classeMarcado(m) : d.data === hoje ? "ring-2 ring-tinta" : ""
              } ${d.data === hoje && m ? "underline decoration-2" : ""} ${futuro ? "opacity-40" : ""}`}
              style={{ backgroundColor: n.fundo, color: n.texto }}
            >
              {d.dia}
            </span>
          );
        })}
      </div>
      {Object.keys(marcados).length > 0 && <LegendaEntradas />}
      <div className="mt-3 flex items-center justify-end gap-1 text-xs text-tinta-suave" aria-hidden>
        menos
        {NIVEIS.map((n, i) => (
          <span key={i} className="size-4 rounded" style={{ backgroundColor: n.fundo }} />
        ))}
        mais
      </div>
      <VerEmTabela
        linhas={dias.filter((d) => d.valor > 0).map((d) => [diaCurto(d.data), formatarCentavos(d.valor)])}
      />
    </>
  );
}
