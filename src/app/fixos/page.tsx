import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Repeat, Tv } from "lucide-react";
import { BotaoEncerrar } from "@/components/botao-encerrar";
import { BotaoPausar, BotaoRetomar } from "@/components/botoes-pausa";
import { BotaoVirarFixo } from "@/components/form-fixo";
import { assinaturasDetectadas } from "@/db/painel";
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
  const [linhas, detectadas] = await Promise.all([listarRecorrencias(), assinaturasDetectadas(hoje)]);
  const editar = (id: string) => (
    <Link href={`/fixos/${id}/editar`} aria-label="Editar" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-fundo">
      <Pencil size={16} aria-hidden />
    </Link>
  );

  const itens = linhas.map((l) => {
    const cartao = l.formaTipo === "credito" ? { diaFechamento: l.diaFechamento, diaVencimento: l.diaVencimento } : null;
    const proxima = proximaOcorrencia(l.rec, cartao, hoje);
    const pausado = !l.rec.ativa && !l.rec.dataFim;
    return { ...l, proxima, pausado, geradas: quantasGeradas(l.rec), ativo: proxima !== null && !pausado };
  });
  const ativos = itens.filter((i) => i.ativo);
  const pausados = itens.filter((i) => i.pausado);
  const encerrados = itens.filter((i) => !i.ativo && !i.pausado);

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

      {detectadas.length > 0 && (
        <section className="flex flex-col gap-2 rounded-card bg-cartao p-4 shadow-suave">
          <h2 className="flex items-center gap-2 font-semibold">
            <Tv size={18} aria-hidden /> Assinaturas que ainda não são fixo
          </h2>
          <p className="text-sm text-tinta-suave">
            Apareceram nos últimos 45 dias (do extrato ou lançadas soltas). Virando fixo, entram nas assinaturas, nos compromissos e em
            Pagamentos todo mês.
          </p>
          <ul className="flex flex-col gap-2">
            {detectadas.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-fundo p-3 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{a.descricao}</span>
                  <span className="block text-xs text-tinta-suave">
                    {formatarCentavos(a.valor)} · última {diaCurto(a.data)}
                  </span>
                </span>
                <BotaoVirarFixo lancamentoId={a.id} compacto />
              </li>
            ))}
          </ul>
        </section>
      )}

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
                className="sobre-pastel flex size-11 shrink-0 items-center justify-center rounded-full"
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
              <span className="flex items-center gap-2">
                {editar(i.rec.id)}
                {i.rec.tipo !== "temporaria" && <BotaoPausar id={i.rec.id} />}
                <BotaoEncerrar id={i.rec.id} />
              </span>
            </div>
          </li>
        ))}
      </ul>

      {pausados.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-tinta-suave uppercase">Pausados</h2>
          <p className="text-sm text-tinta-suave">Não geram lançamento nem entram nos compromissos. Ao retomar, voltam na próxima data.</p>
          <ul className="flex flex-col gap-2">
            {pausados.map((i) => (
              <li key={i.rec.id} className="flex items-center gap-3 rounded-card bg-cartao p-3 opacity-80 shadow-suave">
                <span className="sobre-pastel flex size-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: i.categoriaCor }} aria-hidden>
                  <IconeCategoria nome={i.categoriaIcone} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{i.rec.descricao}</span>
                  <span className="block text-sm text-tinta-suave tabular-nums">{formatarCentavos(i.rec.valor)} · pausado</span>
                </span>
                {editar(i.rec.id)}
                <BotaoRetomar id={i.rec.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

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
                <span className="flex shrink-0 items-center gap-2 tabular-nums">
                  {formatarCentavos(i.rec.valor)}
                  {editar(i.rec.id)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
