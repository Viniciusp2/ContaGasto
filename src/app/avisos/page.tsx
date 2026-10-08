import Link from "next/link";
import {
  ArrowDownCircle,
  BellRing,
  CalendarRange,
  ChevronRight,
  CircleCheck,
  CreditCard,
  HandCoins,
  PencilLine,
  PiggyBank,
  Receipt,
  Target,
  TrendingDown,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { AcoesLembrete, NotificacoesCelular, NovoLembrete, TiposAviso } from "@/components/avisos";
import { avisosAgora, listarLembretes, quantoFalta, ultimosEnviados } from "@/db/avisos";
import { gerarRecorrencias } from "@/db/gerar-recorrencias";
import { chavesVapid, listarAparelhos, preferenciasAvisos } from "@/db/push";
import { textoQuantoFalta, type Nivel } from "@/lib/avisos";
import { diaCurto, hojeISO } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";
import { descreverRepeticao } from "@/lib/lembretes";

export const dynamic = "force-dynamic";

const ICONES: Record<string, LucideIcon> = {
  Receipt,
  ArrowDownCircle,
  BellRing,
  HandCoins,
  Target,
  TrendingDown,
  CreditCard,
  Tv,
  PiggyBank,
  CalendarRange,
  PencilLine,
};

const corDoNivel: Record<Nivel, string> = { urgente: "bg-coral", atencao: "bg-limao", info: "bg-lavanda" };

export default async function Avisos() {
  await gerarRecorrencias();
  const hoje = hojeISO();
  const [avisos, falta, lembretes, preferencias, aparelhos, historico, chaves] = await Promise.all([
    avisosAgora(hoje),
    quantoFalta(hoje, 30),
    listarLembretes(),
    preferenciasAvisos(),
    listarAparelhos(),
    ultimosEnviados(15),
    chavesVapid(),
  ]);
  const pendentes = lembretes.filter((l) => !l.concluido);
  const feitos = lembretes.filter((l) => l.concluido).slice(0, 10);
  const agora = avisos.filter((a) => !a.soNoCelular);

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Avisos</h1>
        <p className="text-sm text-tinta-suave">O que pede atenção, quanto falta pra receber e pagar, e seus lembretes.</p>
      </div>

      <section aria-labelledby="agora" className="flex flex-col gap-2">
        <h2 id="agora" className="font-semibold">
          Agora
        </h2>
        {agora.length === 0 ? (
          <p className="flex items-center gap-3 rounded-card bg-cartao p-4 text-sm shadow-suave">
            <CircleCheck size={22} className="shrink-0 text-positivo" aria-hidden /> Tudo em dia por aqui. Nada pedindo atenção agora.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {agora.map((a) => {
              const Icone = ICONES[a.icone] ?? BellRing;
              return (
                <li key={a.chave}>
                  <Link href={a.href} className="flex min-h-14 items-center gap-3 rounded-card bg-cartao p-3 shadow-suave active:scale-[0.98]">
                    <span className={`sobre-pastel shrink-0 rounded-full p-2 ${corDoNivel[a.nivel]}`}>
                      <Icone size={18} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{a.titulo}</span>
                      <span className="block text-sm text-tinta-suave">{a.texto}</span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-tinta-suave" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {falta.length > 0 && (
        <section aria-labelledby="quanto-falta" className="flex flex-col gap-2">
          <h2 id="quanto-falta" className="font-semibold">
            Quanto falta
          </h2>
          <ul className="flex flex-col divide-y divide-fundo rounded-card bg-cartao px-4 shadow-suave">
            {falta.map((i) => (
              <li key={i.chave}>
                <Link href={i.href} className="flex min-h-14 items-center gap-3 py-2">
                  <span className={`sobre-pastel shrink-0 rounded-full p-2 ${i.entrada ? "bg-menta" : "bg-fundo"}`}>
                    {i.entrada ? <ArrowDownCircle size={16} aria-hidden /> : <Receipt size={16} aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{i.descricao}</span>
                    <span className="block text-xs text-tinta-suave">
                      {i.entrada ? "Cai" : "Vence"} {textoQuantoFalta(i.data, hoje)}, {diaCurto(i.data)}
                      {i.detalhe ? ` · ${i.detalhe}` : ""}
                    </span>
                  </span>
                  <span className={`shrink-0 text-sm font-bold tabular-nums ${i.entrada ? "text-positivo" : ""}`}>
                    {i.entrada ? "+" : ""}
                    {formatarCentavos(i.valor)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="titulo-lembretes" id="lembretes" className="flex scroll-mt-4 flex-col gap-2">
        <h2 id="titulo-lembretes" className="font-semibold">
          Lembretes
        </h2>
        {pendentes.length === 0 ? (
          <p className="text-sm text-tinta-suave">
            Nenhum lembrete. Crie aqui ou peça pro Assistente: &ldquo;me lembra de pagar o IPVA dia 15&rdquo;.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pendentes.map((l) => (
              <li key={l.id} className="flex items-center gap-3 rounded-card bg-cartao p-3 shadow-suave">
                <span className={`sobre-pastel shrink-0 rounded-full p-2 ${l.data <= hoje ? "bg-limao" : "bg-lavanda"}`}>
                  <BellRing size={16} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{l.titulo}</span>
                  <span className="block text-xs text-tinta-suave">
                    {diaCurto(l.data)} ({textoQuantoFalta(l.data, hoje)})
                    {l.repetir !== "nao" && ` · ${descreverRepeticao(l.repetir, l.inicio)}`}
                    {l.origem === "assistente" && " · pelo Assistente"}
                  </span>
                </span>
                <AcoesLembrete id={l.id} titulo={l.titulo} />
              </li>
            ))}
          </ul>
        )}
        <NovoLembrete hoje={hoje} />
        {feitos.length > 0 && (
          <details className="rounded-card bg-cartao px-4 py-2 shadow-suave">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">Feitos ({feitos.length})</summary>
            <ul className="flex flex-col gap-1 pb-2 text-sm text-tinta-suave">
              {feitos.map((l) => (
                <li key={l.id} className="line-through">
                  {l.titulo}, {diaCurto(l.data)}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section aria-labelledby="no-celular" className="flex flex-col gap-2">
        <h2 id="no-celular" className="font-semibold">
          Notificações no celular
        </h2>
        <NotificacoesCelular chavePublica={chaves.publica} temAparelho={aparelhos.length > 0} />
        {aparelhos.length > 0 && (
          <p className="text-xs text-tinta-suave">Recebem: {aparelhos.map((a) => a.nome).join(" · ")}</p>
        )}
        <p className="mt-2 text-sm font-semibold">O que mandar</p>
        <TiposAviso preferencias={preferencias} />
        {historico.length > 0 && (
          <details className="rounded-card bg-cartao px-4 py-2 shadow-suave">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">Últimas notificações</summary>
            <ul className="flex flex-col gap-2 pb-2 text-sm">
              {historico.map((h) => (
                <li key={h.id}>
                  <span className="block font-semibold">{h.titulo}</span>
                  <span className="block text-xs text-tinta-suave">
                    {h.texto} · {diaCurto(hojeISO(h.createdAt))}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </section>
  );
}
