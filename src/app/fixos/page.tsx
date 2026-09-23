import Link from "next/link";
import { ArrowLeft, Plus, Repeat } from "lucide-react";
import { BotaoEncerrar } from "@/components/botao-encerrar";
import { IconeCategoria } from "@/components/icone-categoria";
import { listarRecorrencias } from "@/db/consultas";
import { gerarRecorrencias } from "@/db/gerar-recorrencias";
import { diaCurto, hojeISO } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";
import { descreverDia, proximaOcorrencia, quantasGeradas } from "@/lib/recorrencias";

export const dynamic = "force-dynamic";

const rotuloTipo = {
  fixa: "Todo mês",
  fixa_variavel: "Todo mês, valor muda",
  temporaria: "Parcelado",
} as const;

export default async function Fixos() {
  await gerarRecorrencias();
  const hoje = hojeISO();
  const linhas = await listarRecorrencias();

  const itens = linhas.map((l) => {
    const cartao = l.formaTipo === "credito" ? { diaFechamento: l.diaFechamento, diaVencimento: l.diaVencimento } : null;
    const proxima = proximaOcorrencia(l.rec, cartao, hoje);
    return { ...l, proxima, geradas: quantasGeradas(l.rec), ativo: proxima !== null };
  });
  const ativos = itens.filter((i) => i.ativo);
  const encerrados = itens.filter((i) => !i.ativo);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link href="/mais" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave">
          <ArrowLeft size={16} aria-hidden /> Mais
        </Link>
        <h1 className="text-2xl font-bold">Fixos e parcelas</h1>
        <p className="text-sm text-tinta-suave">
          Viram lançamento sozinhos quando a data chega. Pra criar, use o + e escolha como repete.
        </p>
      </div>

      {ativos.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-card bg-cartao p-8 text-center shadow-suave">
          <span className="rounded-full bg-lavanda p-4">
            <Repeat size={28} aria-hidden />
          </span>
          <p className="text-tinta-suave">Nada repetindo por enquanto. Aluguel, internet, salário e parcelas moram aqui.</p>
          <Link href="/lancamentos/novo" className="flex min-h-11 items-center gap-2 rounded-full bg-coral px-5 font-semibold">
            <Plus size={18} aria-hidden /> Criar
          </Link>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {ativos.map((i) => (
          <li key={i.rec.id} className="rounded-card bg-cartao p-4 shadow-suave">
            <div className="flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: i.categoriaCor }}
                aria-hidden
              >
                <IconeCategoria nome={i.categoriaIcone} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{i.rec.descricao}</p>
                <p className="truncate text-sm text-tinta-suave">
                  {rotuloTipo[i.rec.tipo]}
                  {i.rec.tipo !== "temporaria" ? `, ${descreverDia(i.rec)}` : ""}
                  {i.formaNome ? ` · ${i.formaNome}` : ""}
                </p>
              </div>
              <p className={`shrink-0 font-bold tabular-nums ${i.categoriaTipo === "entrada" ? "rounded-full bg-menta px-2.5" : ""}`}>
                {i.rec.tipo === "fixa_variavel" ? "~ " : ""}
                {formatarCentavos(i.rec.valor)}
              </p>
            </div>

            {i.rec.tipo === "temporaria" && i.rec.totalParcelas && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-sm">
                  <span>
                    {i.geradas} de {i.rec.totalParcelas} parcelas
                  </span>
                  <span className="text-tinta-suave">
                    falta {formatarCentavos(i.rec.valor * (i.rec.totalParcelas - i.geradas))}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-fundo">
                  <div
                    className="h-full rounded-full bg-lavanda"
                    style={{ width: `${(i.geradas / i.rec.totalParcelas) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-sm">
                {i.proxima && (
                  <>
                    Próxima: <strong className="capitalize">{diaCurto(i.proxima.data)}</strong>
                    {i.proxima.parcela ? ` (${i.proxima.parcela}/${i.rec.totalParcelas})` : ""}
                  </>
                )}
              </p>
              <BotaoEncerrar id={i.rec.id} />
            </div>
          </li>
        ))}
      </ul>

      {encerrados.length > 0 && (
        <details className="rounded-card bg-cartao px-4 py-1 shadow-suave">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">
            Encerrados e parcelas quitadas ({encerrados.length})
          </summary>
          <ul className="flex flex-col gap-2 pb-3">
            {encerrados.map((i) => (
              <li key={i.rec.id} className="flex items-center justify-between gap-2 text-sm text-tinta-suave">
                <span className="flex min-w-0 items-center gap-2">
                  <IconeCategoria nome={i.categoriaIcone} size={16} />
                  <span className="truncate">{i.rec.descricao}</span>
                </span>
                <span className="shrink-0 tabular-nums">{formatarCentavos(i.rec.valor)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
