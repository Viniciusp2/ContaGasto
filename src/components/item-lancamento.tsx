import Link from "next/link";
import type { ItemLancamento } from "@/db/consultas";
import { formatarCentavos } from "@/lib/dinheiro";

export function ItemLancamentoLinha({ item }: { item: ItemLancamento }) {
  const estimado = item.status === "estimado";
  const entrada = item.tipo === "entrada";

  return (
    <li>
      <Link
        href={`/lancamentos/${item.id}/editar`}
        className={`flex min-h-16 items-center gap-3 rounded-card bg-cartao px-3 py-2 shadow-suave transition-transform active:scale-[0.98] ${
          estimado ? "opacity-70" : ""
        }`}
      >
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-xl"
          style={{ backgroundColor: item.categoriaCor }}
          aria-hidden
        >
          {item.categoriaEmoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{item.descricao}</span>
          <span className="block truncate text-sm text-tinta-suave">
            {item.categoriaNome}
            {item.formaNome ? ` · ${item.formaNome}` : ""}
            {estimado ? " · estimado" : ""}
          </span>
        </span>
        <span
          className={`shrink-0 font-bold tabular-nums ${entrada ? "rounded-full bg-menta px-2.5 py-0.5" : ""}`}
        >
          {entrada ? "+ " : "- "}
          {formatarCentavos(item.valor)}
        </span>
      </Link>
    </li>
  );
}
