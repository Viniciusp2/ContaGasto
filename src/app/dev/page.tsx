import Link from "next/link";
import { ArrowLeft, Bot, CircleCheck, CircleX, Database, ScrollText, Stethoscope, TriangleAlert } from "lucide-react";
import { BotaoApagarLogs, CopiarDiagnostico, TestarIA } from "@/components/dev-acoes";
import { USA_NEON } from "@/db";
import { resumoDasTabelas } from "@/db/dev";
import { apagarLogsAntigos, DIAS_DE_LOG, listarLogs, origensDosLogs } from "@/db/logs";
import { avisosDeValor, estadoVariaveis, NIVEIS, nomesParecidos, textoDiagnostico, type NivelLog } from "@/lib/dev";
import { descreverIA, descreverReserva, listarIAs } from "@/lib/ia";
import { textoVersao, VERSAO_ATUAL } from "@/lib/versao";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ABAS = [
  { valor: "diagnostico", rotulo: "Diagnóstico", Icone: Stethoscope },
  { valor: "logs", rotulo: "Logs", Icone: ScrollText },
  { valor: "dados", rotulo: "Dados", Icone: Database },
] as const;

const COR_NIVEL: Record<string, string> = { info: "bg-menta", aviso: "bg-limao", erro: "bg-coral" };

const quando = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .format(d)
    .replace(",", "");

function Cartao({ titulo, Icone, children }: { titulo: string; Icone: typeof Bot; children: React.ReactNode }) {
  return (
    <section className="rounded-card bg-cartao p-4 shadow-suave">
      <h2 className="mb-3 flex items-center gap-2 font-bold">
        <Icone size={18} aria-hidden /> {titulo}
      </h2>
      {children}
    </section>
  );
}

// Área Dev (só do Vinícius, atrás do login com autenticador): diagnóstico, logs e dados, pra achar
// problema rápido e pra colar o diagnóstico na conversa com o Claude. Nunca mostra valor de chave.
export default async function Dev({ searchParams }: PageProps<"/dev">) {
  const params = await searchParams;
  const aba = ABAS.some((a) => a.valor === params.aba) ? (params.aba as string) : "diagnostico";
  const nivel = NIVEIS.includes(params.nivel as NivelLog) ? (params.nivel as NivelLog) : undefined;
  const origem = typeof params.origem === "string" && params.origem ? params.origem : undefined;

  await apagarLogsAntigos();
  const env = process.env;
  const variaveis = estadoVariaveis(env);
  const parecidos = nomesParecidos(env);
  const avisos = avisosDeValor(env);
  const ias = listarIAs(env);
  const ambiente = env.VERCEL_ENV ?? env.NODE_ENV ?? "?";
  const banco = USA_NEON ? "Neon (nuvem)" : "PGlite (local)";
  const ultimosErros = await listarLogs({ nivel: "erro", limite: 5 });
  const diagnostico = textoDiagnostico({
    versao: textoVersao(VERSAO_ATUAL),
    ambiente,
    banco,
    variaveis,
    parecidos,
    avisos,
    ias,
    erros: ultimosErros.map((e) => ({ em: quando(e.em), origem: e.origem, mensagem: e.mensagem, detalhe: e.detalhe })),
  });
  const principal = descreverIA(env);
  const reserva = descreverReserva(env);

  const href = (mudar: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const tudo = { aba, nivel, origem, ...mudar };
    for (const [k, v] of Object.entries(tudo)) if (v) q.set(k, v);
    return `/dev?${q}`;
  };
  const chip = (ativo: boolean) =>
    `flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold active:scale-95 ${ativo ? "bg-lavanda" : "bg-cartao shadow-suave"}`;

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link href="/mais" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave">
          <ArrowLeft size={16} aria-hidden /> Mais
        </Link>
        <h1 className="text-2xl font-bold">Dev</h1>
        <p className="text-sm text-tinta-suave">Só você vê. Pra achar problema e mandar o diagnóstico pro Claude.</p>
      </div>
      <CopiarDiagnostico texto={diagnostico} />

      <nav aria-label="Seções" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {ABAS.map(({ valor, rotulo, Icone }) => (
          <Link key={valor} href={href({ aba: valor })} aria-current={aba === valor ? "page" : undefined} className={chip(aba === valor)}>
            <Icone size={16} aria-hidden /> {rotulo}
          </Link>
        ))}
      </nav>

      {aba === "diagnostico" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Cartao titulo="No ar" Icone={Stethoscope}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-tinta-suave">Versão</dt>
              <dd className="tabular-nums">{textoVersao(VERSAO_ATUAL)}</dd>
              <dt className="text-tinta-suave">Ambiente</dt>
              <dd>{ambiente}</dd>
              <dt className="text-tinta-suave">Banco</dt>
              <dd>{banco}</dd>
              <dt className="text-tinta-suave">IA</dt>
              <dd>{principal ?? "nenhuma pronta"}</dd>
              <dt className="text-tinta-suave">Reserva</dt>
              <dd>{reserva ?? (env.IA_RESERVA ? "configurada, mas não está pronta (veja os avisos)" : "nenhuma")}</dd>
            </dl>
          </Cartao>

          <Cartao titulo="IAs" Icone={Bot}>
            <ul className="flex flex-col gap-3">
              {ias.map((ia) => (
                <li key={ia.nome} className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    {ia.pronta ? (
                      <CircleCheck size={20} className="mt-0.5 shrink-0 text-positivo" aria-label="pronta" />
                    ) : (
                      <CircleX size={20} className="mt-0.5 shrink-0 text-negativo" aria-label="sem chave" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold">{ia.descricao}</p>
                      {!ia.pronta && <p className="text-xs text-tinta-suave">{ia.motivo}</p>}
                    </div>
                  </div>
                  <TestarIA nome={ia.nome} pronta={ia.pronta} />
                </li>
              ))}
            </ul>
          </Cartao>

          <Cartao titulo="Variáveis" Icone={Database}>
            <p className="mb-3 text-xs text-tinta-suave">Só o nome e se existe. O valor nunca aparece aqui.</p>
            {avisos.map((a) => (
              <div key={a} className="mb-3 flex gap-2 rounded-2xl bg-coral p-3 text-sm">
                <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
                <p>{a}</p>
              </div>
            ))}
            {parecidos.length > 0 && (
              <div className="mb-3 flex gap-2 rounded-2xl bg-limao p-3 text-sm">
                <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
                <div>
                  {parecidos.map((p) => (
                    <p key={p.encontrado}>
                      Achei <code className="font-mono">{p.encontrado}</code>: o app procura <code className="font-mono">{p.talvezSeja}</code>.
                      Renomeie na Vercel e faça Redeploy.
                    </p>
                  ))}
                </div>
              </div>
            )}
            <ul className="flex flex-col gap-2 text-sm">
              {variaveis.map((v) => (
                <li key={v.nome} className="flex items-start gap-2">
                  {v.definida ? (
                    <CircleCheck size={18} className="mt-0.5 shrink-0 text-positivo" aria-label="definida" />
                  ) : (
                    <CircleX size={18} className="mt-0.5 shrink-0 text-tinta-suave" aria-label="não definida" />
                  )}
                  <div className="min-w-0">
                    <p className="break-all font-mono text-xs font-semibold">
                      {v.nome}
                      {v.comoNome && <span className="font-normal text-tinta-suave"> (como {v.comoNome})</span>}
                    </p>
                    <p className="text-xs text-tinta-suave">
                      {v.grupo}: {v.dica}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Cartao>
        </div>
      )}

      {aba === "logs" && <Logs nivel={nivel} origem={origem} href={href} chip={chip} />}
      {aba === "dados" && <Dados />}
    </section>
  );
}

async function Logs({
  nivel,
  origem,
  href,
  chip,
}: {
  nivel?: NivelLog;
  origem?: string;
  href: (m: Record<string, string | undefined>) => string;
  chip: (ativo: boolean) => string;
}) {
  const [lista, origens] = await Promise.all([listarLogs({ nivel, origem }), origensDosLogs()]);
  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Filtrar por nível">
        <Link href={href({ nivel: undefined })} className={chip(!nivel)}>
          Todos
        </Link>
        {NIVEIS.map((n) => (
          <Link key={n} href={href({ nivel: n })} className={chip(nivel === n)}>
            <span className={`size-2.5 rounded-full ${COR_NIVEL[n]}`} aria-hidden /> {n}
          </Link>
        ))}
      </div>
      {origens.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Filtrar por origem">
          <Link href={href({ origem: undefined })} className={chip(!origem)}>
            Todas as origens
          </Link>
          {origens.map((o) => (
            <Link key={o} href={href({ origem: o })} className={chip(origem === o)}>
              {o}
            </Link>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-tinta-suave">
          {lista.length} {lista.length === 1 ? "registro" : "registros"} (os mais novos primeiro; somem depois de {DIAS_DE_LOG} dias)
        </p>
        <BotaoApagarLogs />
      </div>
      {lista.length === 0 ? (
        <p className="rounded-card bg-cartao p-6 text-center text-tinta-suave shadow-suave">Nada registrado ainda.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {lista.map((l) => (
            <li key={l.id} className="rounded-card bg-cartao p-3 shadow-suave">
              <details>
                <summary className="flex cursor-pointer list-none flex-col gap-1">
                  <span className="flex items-center gap-2 text-xs text-tinta-suave">
                    <span className={`rounded-full px-2 py-0.5 font-semibold text-tinta sobre-pastel ${COR_NIVEL[l.nivel] ?? "bg-fundo"}`}>{l.nivel}</span>
                    <span>{l.origem}</span>
                    <span className="ml-auto tabular-nums">{quando(l.em)}</span>
                  </span>
                  <span className="text-sm">{l.mensagem}</span>
                </summary>
                {l.detalhe != null && (
                  <pre className="mt-2 overflow-x-auto rounded-2xl bg-fundo p-3 text-xs">{JSON.stringify(l.detalhe, null, 2)}</pre>
                )}
              </details>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

async function Dados() {
  const tabelas = await resumoDasTabelas();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-tinta-suave">Só leitura: pra mudar, use as telas do app (elas conferem tudo antes de gravar).</p>
      {tabelas.map((t) => (
        <details key={t.nome} className="rounded-card bg-cartao p-3 shadow-suave">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2">
            <span className="font-mono text-sm font-semibold">{t.nome}</span>
            <span className="text-sm tabular-nums text-tinta-suave">
              {t.erro ? "erro" : `${t.total} ${t.total === 1 ? "registro" : "registros"}`}
            </span>
          </summary>
          {t.erro ? (
            <p className="mt-2 text-xs text-negativo">{t.erro}</p>
          ) : t.sigilosa ? (
            <p className="mt-2 text-xs text-tinta-suave">Tem senha, chave ou segredo: aqui só aparece a contagem.</p>
          ) : t.ultimos.length > 0 ? (
            <pre className="mt-2 max-h-96 overflow-auto rounded-2xl bg-fundo p-3 text-xs">{JSON.stringify(t.ultimos, null, 2)}</pre>
          ) : (
            <p className="mt-2 text-xs text-tinta-suave">Vazia.</p>
          )}
        </details>
      ))}
    </div>
  );
}
