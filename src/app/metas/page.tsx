import { Target } from "lucide-react";
import { BarraProgresso } from "@/components/barra-progresso";
import { EditarMeta, NovaMeta } from "@/components/form-meta";
import { IconeCategoria } from "@/components/icone-categoria";
import { SeletorMes } from "@/components/seletor-mes";
import { listarCategoriasAtivas } from "@/db/consultas";
import { gerarRecorrencias } from "@/db/gerar-recorrencias";
import { metasDoMes } from "@/db/metas-do-mes";
import { lerMes } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";

export const dynamic = "force-dynamic";

const textoEstado = { ok: "tranquilo", atencao: "chegando no limite", estourou: "estourou" } as const;

export default async function Metas({ searchParams }: PageProps<"/metas">) {
  await gerarRecorrencias();
  const params = await searchParams;
  const mes = lerMes(typeof params.mes === "string" ? params.mes : undefined);
  const [metas, categorias] = await Promise.all([metasDoMes(mes), listarCategoriasAtivas()]);

  // Só categorias de gasto que ainda não têm meta (VA fica de fora: não é seu dinheiro)
  const comMeta = new Set(metas.map((m) => m.categoriaId));
  const semMeta = categorias.filter((c) => c.tipo === "gasto" && !comMeta.has(c.id));
  const ordem = { estourou: 0, atencao: 1, ok: 2 } as const;
  const lista = [...metas].sort((a, b) => ordem[a.estado] - ordem[b.estado] || b.fracao - a.fracao);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Metas</h1>
        <p className="text-sm text-tinta-suave">Teto de gasto por categoria, todo mês.</p>
      </div>
      <SeletorMes mes={mes} href={(m) => `/metas?mes=${m}`} />

      {lista.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-card bg-cartao p-8 text-center shadow-suave">
          <span className="rounded-full bg-lavanda p-4">
            <Target size={28} aria-hidden />
          </span>
          <p className="text-tinta-suave">Nenhuma meta ainda. Que tal um limite pro Lazer ou pra Comida?</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {lista.map((m) => (
          <li key={m.id} className="rounded-card bg-cartao p-4 shadow-suave">
            <div className="mb-2 flex items-center gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: m.categoriaCor }}
                aria-hidden
              >
                <IconeCategoria nome={m.categoriaIcone} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{m.categoriaNome}</p>
                <p className="text-sm text-tinta-suave tabular-nums">
                  {formatarCentavos(m.gasto)} de {formatarCentavos(m.limiteMensal)}
                </p>
              </div>
              <EditarMeta id={m.id} categoriaId={m.categoriaId} limite={m.limiteMensal} />
            </div>
            <BarraProgresso fracao={m.fracao} estado={m.estado} rotulo={`${m.categoriaNome}: ${Math.round(m.fracao * 100)}%`} />
            <p className={`mt-2 text-sm ${m.estado === "estourou" ? "font-semibold" : ""}`}>
              {m.estado === "estourou"
                ? `Estourou: passou ${formatarCentavos(m.passou)}`
                : `${Math.round(m.fracao * 100)}%, ${textoEstado[m.estado]}. Ainda dá ${formatarCentavos(m.falta)}.`}
            </p>
          </li>
        ))}
      </ul>

      <NovaMeta categorias={semMeta} />
    </section>
  );
}
