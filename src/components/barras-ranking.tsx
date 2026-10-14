import { BarraProgresso } from "@/components/barra-progresso";
import { formatarCentavos } from "@/lib/dinheiro";

// Ranking em barras horizontais com o valor escrito ao lado (uma série, uma cor). As barras enchem ao aparecer.
export function BarrasRanking({
  itens,
  estado,
  mostrarPorcentagem = false,
}: {
  itens: { nome: string; valor: number; fracao?: number }[];
  estado: "gasto" | "dado";
  mostrarPorcentagem?: boolean;
}) {
  const maior = Math.max(...itens.map((i) => i.valor), 1);
  return (
    <ul className="flex flex-col gap-3">
      {itens.map((i) => (
        <li key={i.nome} className="text-sm">
          <span className="mb-1 flex justify-between gap-2">
            <span className="truncate">{i.nome}</span>
            <span className="shrink-0 tabular-nums">
              <strong>{formatarCentavos(i.valor)}</strong>
              {mostrarPorcentagem && i.fracao !== undefined && (
                <span className="text-tinta-suave"> · {Math.round(i.fracao * 100)}%</span>
              )}
            </span>
          </span>
          <BarraProgresso fracao={Math.max(i.valor / maior, 0.02)} estado={estado} rotulo={`${i.nome}: ${formatarCentavos(i.valor)}`} />
        </li>
      ))}
    </ul>
  );
}
