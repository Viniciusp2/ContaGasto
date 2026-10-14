import Link from "next/link";
import { Flag } from "lucide-react";
import { IconeCategoria } from "@/components/icone-categoria";
import { diaCurto } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";
import type { ItemTempo, montarLinhaDoTempo } from "@/lib/linha-do-tempo";

type Linha = ReturnType<typeof montarLinhaDoTempo>;

function Item({ item, hoje, apagado = false }: { item: ItemTempo; hoje: string; apagado?: boolean }) {
  const alerta = item.detalhe === "confirme o valor" || item.detalhe === "atrasado";
  const conteudo = (
    <>
      <span
        className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-lavanda ring-4 ring-cartao ${item.cor ? "sobre-pastel" : ""}`}
        style={item.cor ? { backgroundColor: item.cor } : undefined}
        aria-hidden
      >
        <IconeCategoria nome={item.icone ?? ""} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{item.descricao}</span>
        <span className="block text-xs text-tinta-suave">
          <span className="capitalize">{item.data === hoje ? "hoje" : diaCurto(item.data)}</span>
          {item.detalhe && (
            <span className={`ml-1 rounded-full px-1.5 font-semibold ${alerta ? "bg-coral text-tinta" : "bg-fundo"}`}>
              {item.detalhe}
            </span>
          )}
        </span>
      </span>
      <span
        className={`shrink-0 text-sm font-bold tabular-nums ${item.entrada ? "rounded-full bg-menta px-2" : ""} ${apagado ? "opacity-70" : ""}`}
      >
        {item.entrada ? "+ " : "- "}
        {formatarCentavos(item.valor)}
      </span>
    </>
  );
  return (
    <li>
      {item.href ? (
        <Link href={item.href} className="flex min-h-12 items-center gap-3 rounded-2xl active:bg-fundo">
          {conteudo}
        </Link>
      ) : (
        <div className="flex min-h-12 items-center gap-3">{conteudo}</div>
      )}
    </li>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-bold tracking-wide text-tinta-suave uppercase">{titulo}</h3>
      <ul className="relative flex flex-col before:absolute before:top-2 before:bottom-2 before:left-4 before:w-0.5 before:bg-lavanda">
        {children}
      </ul>
    </div>
  );
}

// Linha do tempo (4.10): o que já aconteceu, o que vai cair e como o mês fecha
export function LinhaDoTempo({ linha, hoje, mesTexto }: { linha: Linha; hoje: string; mesTexto: string }) {
  const { fimDoMes } = linha;
  return (
    <section className="flex flex-col gap-4 rounded-card bg-cartao p-4 shadow-suave">
      <h2 className="font-bold">Linha do tempo</h2>

      {(linha.hoje.length > 0 || linha.recentes.length > 0) && (
        <Grupo titulo="Até hoje">
          {linha.hoje.map((i) => (
            <Item key={i.chave} item={i} hoje={hoje} />
          ))}
          {linha.recentes.map((i) => (
            <Item key={i.chave} item={i} hoje={hoje} />
          ))}
          {linha.maisAntigos > 0 && (
            <li className="pl-11 text-xs">
              <Link href={`/lancamentos?mes=${mesTexto}`} className="inline-flex min-h-11 items-center text-tinta-suave underline">
                e mais {linha.maisAntigos} no mês
              </Link>
            </li>
          )}
        </Grupo>
      )}

      {linha.proximos.length > 0 && (
        <Grupo titulo="Próximos dias">
          {linha.proximos.map((i) => (
            <Item key={i.chave} item={i} hoje={hoje} apagado />
          ))}
        </Grupo>
      )}

      <div className="flex items-start gap-3 rounded-2xl bg-fundo p-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-limao" aria-hidden>
          <Flag size={16} />
        </span>
        <div className="flex-1 text-sm">
          <p className="font-semibold">Fim do mês</p>
          <p>
            {fimDoMes.disponivel >= 0 ? "Sobram " : "Faltam "}
            <strong className="tabular-nums">{formatarCentavos(Math.abs(fimDoMes.disponivel))}</strong> depois de tudo cair
          </p>
          {fimDoMes.entradasPrevistas > 0 && (
            <p className="text-tinta-suave">
              Se a entrada prevista de {formatarCentavos(fimDoMes.entradasPrevistas)} cair:{" "}
              <strong className="tabular-nums">{formatarCentavos(fimDoMes.comEntradasPrevistas)}</strong>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
