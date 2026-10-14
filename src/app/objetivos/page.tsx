import Link from "next/link";
import { ArrowLeft, PiggyBank } from "lucide-react";
import { BarraProgresso } from "@/components/barra-progresso";
import { AcoesObjetivo, NovoObjetivo } from "@/components/form-objetivo";
import { IconeCategoria } from "@/components/icone-categoria";
import { listarObjetivos } from "@/db/consultas";
import { hojeISO, nomeDoMes, mesDe } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";
import { planoDoObjetivo } from "@/lib/objetivos";

export const dynamic = "force-dynamic";

export default async function Objetivos() {
  const hoje = hojeISO();
  const objetivos = (await listarObjetivos()).map((o) => ({ ...o, ...planoDoObjetivo(o.valorAlvo, o.saldo, hoje, o.dataAlvo) }));
  const totalGuardado = objetivos.reduce((s, o) => s + o.saldo, 0);
  const porMesTotal = objetivos.reduce((s, o) => s + o.porMes, 0);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link href="/mais" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave">
          <ArrowLeft size={16} aria-hidden /> Mais
        </Link>
        <h1 className="text-2xl font-bold">Objetivos</h1>
        <p className="text-sm text-tinta-suave">
          Dinheiro guardado não é gasto: continua na sua conta, só fica separado.
        </p>
      </div>

      {objetivos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-card bg-cartao p-4 shadow-suave">
            <p className="text-sm text-tinta-suave">Guardado</p>
            <p className="text-lg font-bold tabular-nums">{formatarCentavos(totalGuardado)}</p>
          </div>
          <div className="rounded-card bg-cartao p-4 shadow-suave">
            <p className="text-sm text-tinta-suave">Guardar por mês</p>
            <p className="text-lg font-bold tabular-nums">{formatarCentavos(porMesTotal)}</p>
          </div>
        </div>
      )}

      {objetivos.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-card bg-cartao p-8 text-center shadow-suave">
          <span className="rounded-full bg-lavanda p-4">
            <PiggyBank size={28} aria-hidden />
          </span>
          <p className="text-tinta-suave">Nenhuma caixinha ainda. Celular novo, viagem, reserva de emergência...</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {objetivos.map((o) => (
          <li key={o.id} className="rounded-card bg-cartao p-4 shadow-suave">
            <div className="mb-2 flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lavanda" aria-hidden>
                <IconeCategoria nome={o.icone} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{o.nome}</p>
                <p className="text-sm text-tinta-suave">
                  até <span className="capitalize">{nomeDoMes(mesDe(o.dataAlvo))}</span>
                </p>
              </div>
              <p className="shrink-0 text-right text-sm tabular-nums">
                <span className="block font-bold">{formatarCentavos(o.saldo)}</span>
                <span className="text-tinta-suave">de {formatarCentavos(o.valorAlvo)}</span>
              </p>
            </div>
            <BarraProgresso
              fracao={o.fracao}
              estado={o.concluido ? "ok" : "neutro"}
              rotulo={`${o.nome}: ${Math.round(o.fracao * 100)}%`}
            />
            <p className="mt-2 text-sm">
              {o.concluido ? (
                <strong>Chegou lá!</strong>
              ) : o.prazoPassou ? (
                <>
                  O prazo passou. Faltam <strong className="tabular-nums">{formatarCentavos(o.falta)}</strong>.
                </>
              ) : (
                <>
                  Faltam <strong className="tabular-nums">{formatarCentavos(o.falta)}</strong>: guarde{" "}
                  <strong className="tabular-nums">{formatarCentavos(o.porMes)}</strong> por mês
                  {o.meses > 1 ? ` por ${o.meses} meses` : " este mês"}.
                </>
              )}
            </p>
            <AcoesObjetivo id={o.id} saldo={o.saldo} hoje={hoje} />
          </li>
        ))}
      </ul>

      <NovoObjetivo />
    </section>
  );
}
