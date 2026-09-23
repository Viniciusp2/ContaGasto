import { VerEmTabela } from "@/components/graficos";
import { diaCurto } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";

// Escala sequencial de um tom (coral), validada: clara -> escura, com número legível em cada casa
const NIVEIS = [
  { fundo: "var(--fundo)", texto: "var(--tinta-suave)" },
  { fundo: "#F29E72", texto: "var(--tinta)" },
  { fundo: "#E8845A", texto: "var(--tinta)" },
  { fundo: "#BF4F1E", texto: "#FFFFFF" },
  { fundo: "#9E3E16", texto: "#FFFFFF" },
];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

export function MapaDeCalor({
  dias,
  vazias,
  hoje,
}: {
  dias: { dia: number; data: string; valor: number; nivel: number }[];
  vazias: number;
  hoje: string;
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
          return (
            <span
              key={d.dia}
              title={`${diaCurto(d.data)}: ${formatarCentavos(d.valor)}`}
              aria-label={`${diaCurto(d.data)}: ${formatarCentavos(d.valor)}`}
              className={`flex aspect-square items-center justify-center rounded-lg font-semibold tabular-nums ${
                d.data === hoje ? "ring-2 ring-tinta" : ""
              } ${futuro ? "opacity-40" : ""}`}
              style={{ backgroundColor: n.fundo, color: n.texto }}
            >
              {d.dia}
            </span>
          );
        })}
      </div>
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
