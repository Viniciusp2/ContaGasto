import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { alternarCategoria } from "@/app/configuracoes/actions";
import { EditorCategoria } from "@/components/editor-categoria";
import { LinhaForma, NovaForma } from "@/components/editor-forma";
import { IconeCategoria } from "@/components/icone-categoria";
import { db } from "@/db";
import { listarFormasPagamento } from "@/db/consultas";
import { categorias } from "@/db/schema";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import { TIPOS_FORMA, categoriaProtegida } from "@/lib/categorias";

export const dynamic = "force-dynamic";

const ROTULO_TIPO: Record<string, string> = {
  ...Object.fromEntries(TIPOS_FORMA.map((t) => [t.valor, t.rotulo])),
  beneficio: "Vale alimentação (do app)",
};

export default async function Configuracoes() {
  // Todas, inclusive as desativadas (que não aparecem nos formulários)
  const lista = await db
    .select()
    .from(categorias)
    .where(and(eq(categorias.userId, USUARIO_PADRAO.id)))
    .orderBy(asc(categorias.createdAt), asc(categorias.nome));
  const formas = await listarFormasPagamento();

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link href="/mais" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave">
          <ArrowLeft size={16} aria-hidden /> Mais
        </Link>
        <h1 className="text-2xl font-bold">Categorias e formas de pagamento</h1>
      </div>

      {(["gasto", "entrada"] as const).map((tipo) => (
        <section key={tipo} className="flex flex-col gap-2 rounded-card bg-cartao p-4 shadow-suave">
          <h2 className="font-semibold">Categorias de {tipo}</h2>
          <ul className="flex flex-col">
            {lista
              .filter((c) => c.tipo === tipo)
              .map((c) => {
                const protegida = categoriaProtegida(c.nome);
                return (
                  <li key={c.id} className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 py-1 ${c.ativa ? "" : "opacity-60"}`}>
                    <span className="sobre-pastel flex size-9 items-center justify-center rounded-full" style={{ backgroundColor: c.cor }} aria-hidden>
                      <IconeCategoria nome={c.icone} size={18} />
                    </span>
                    <span className="min-w-0 truncate">
                      {c.nome}
                      {!c.ativa && <span className="ml-1 text-xs text-tinta-suave">(desativada)</span>}
                    </span>
                    {protegida ? (
                      <span className="text-xs text-tinta-suave">do app</span>
                    ) : (
                      <form action={alternarCategoria.bind(null, c.id)}>
                        <button type="submit" className="min-h-11 px-2 text-xs font-semibold text-tinta-suave underline">
                          {c.ativa ? "Desativar" : "Reativar"}
                        </button>
                      </form>
                    )}
                    <EditorCategoria categoria={{ id: c.id, nome: c.nome, icone: c.icone, cor: c.cor, tipo: c.tipo, protegida }} />
                  </li>
                );
              })}
          </ul>
          <EditorCategoria tipoNovo={tipo} />
          <p className="text-xs text-tinta-suave">Desativar tira dos formulários, mas o que já foi lançado continua com ela.</p>
        </section>
      ))}

      <section className="flex flex-col gap-2 rounded-card bg-cartao p-4 shadow-suave">
        <h2 className="font-semibold">Formas de pagamento</h2>
        <ul className="flex flex-col divide-y divide-fundo">
          {formas.map((f) => (
            <LinhaForma key={f.id} id={f.id} nome={f.nome} tipoRotulo={ROTULO_TIPO[f.tipo] ?? f.tipo} doSistema={f.tipo === "beneficio"} />
          ))}
        </ul>
        <NovaForma />
      </section>
    </section>
  );
}
