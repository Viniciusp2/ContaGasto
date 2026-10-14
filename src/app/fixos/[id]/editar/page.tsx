import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, eq, inArray } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { ApagarFixo, FormFixo } from "@/components/form-fixo";
import { db } from "@/db";
import { buscarCategoria, listarCategoriasAtivas, listarContas, listarFormasPagamento } from "@/db/consultas";
import { lancamentos, recorrencias } from "@/db/schema";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import { quantasGeradas } from "@/lib/recorrencias";
import { ehUuid } from "@/lib/validar-lancamento";

export const dynamic = "force-dynamic";

const rotulo = { fixa: "Todo mês", fixa_variavel: "Todo mês, valor muda", temporaria: "Parcelado" } as const;

export default async function EditarFixo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ehUuid(id)) notFound();
  const [rec] = await db.select().from(recorrencias).where(and(eq(recorrencias.id, id), eq(recorrencias.userId, USUARIO_PADRAO.id)));
  if (!rec) notFound();

  const doFixo = and(eq(lancamentos.recorrenciaId, id), eq(lancamentos.userId, USUARIO_PADRAO.id));
  const [categoriaAtual, categorias, formas, contas, [{ total }], [{ abertas }]] = await Promise.all([
    buscarCategoria(rec.categoriaId),
    listarCategoriasAtivas(),
    listarFormasPagamento(),
    listarContas(),
    db.select({ total: count() }).from(lancamentos).where(doFixo),
    db.select({ abertas: count() }).from(lancamentos).where(and(doFixo, inArray(lancamentos.status, ["a_pagar", "estimado"]))),
  ]);
  const tipo = categoriaAtual?.tipo ?? "gasto";
  // A categoria atual aparece mesmo se estiver desativada
  const daMesma = categorias.filter((c) => c.tipo === tipo);
  if (categoriaAtual && !daMesma.some((c) => c.id === categoriaAtual.id)) daMesma.unshift(categoriaAtual);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link href="/fixos" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave">
          <ArrowLeft size={16} aria-hidden /> Fixos e parcelas
        </Link>
        <h1 className="text-2xl font-bold">Editar fixo</h1>
        <p className="text-sm text-tinta-suave">
          {rotulo[rec.tipo]} · {tipo} · já lançou {total} vez{total === 1 ? "" : "es"}
        </p>
      </div>
      <FormFixo
        fixo={{
          id: rec.id,
          tipo: rec.tipo,
          descricao: rec.descricao,
          valor: rec.tipo === "fixa_variavel" ? (rec.valorEstimado ?? rec.valor) : rec.valor,
          categoriaId: rec.categoriaId,
          formaPagamentoId: rec.formaPagamentoId,
          contaId: rec.contaId,
          diaDoMes: rec.diaDoMes,
          diaUtil: rec.diaUtil,
          sabadoUtil: rec.sabadoUtil,
          totalParcelas: rec.totalParcelas,
          tipoConta: rec.tipoConta,
          automatico: rec.pagamentoAutomatico,
          gasto: tipo === "gasto",
        }}
        categorias={daMesma.map((c) => ({ id: c.id, nome: c.nome, icone: c.icone, cor: c.cor }))}
        formas={formas.filter((f) => tipo === "gasto" || f.tipo !== "beneficio").map((f) => ({ id: f.id, nome: f.nome, tipo: f.tipo }))}
        contas={contas.map((c) => ({ id: c.id, nome: c.nome, sigla: c.sigla, cor: c.cor, corTexto: c.corTexto }))}
        abertas={abertas}
        parcelasGeradas={quantasGeradas(rec)}
      />
      <ApagarFixo id={rec.id} total={total} abertas={abertas} />
    </section>
  );
}
