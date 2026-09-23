import { formatarCentavos } from "@/lib/dinheiro";

// Ranking em barras horizontais com o valor escrito ao lado (uma série, uma cor)
export function BarrasRanking({
  itens,
  cor,
  mostrarPorcentagem = false,
}: {
  itens: { nome: string; valor: number; fracao?: number }[];
  cor: string;
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
          <span className="block h-2.5 overflow-hidden rounded-full bg-fundo">
            <span
              className="block h-full rounded-full"
              style={{ width: `${Math.max((i.valor / maior) * 100, 2)}%`, backgroundColor: cor }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
