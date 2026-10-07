import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BotaoApagar } from "@/components/botao-apagar";
import { FormLancamento } from "@/components/form-lancamento";
import { buscarLancamento, listarCategoriasAtivas, listarContas, listarFormasPagamento } from "@/db/consultas";
import { hojeISO, mesDe, mesParaTexto } from "@/lib/datas";
import { ehUuid } from "@/lib/validar-lancamento";

export const dynamic = "force-dynamic";

export default async function EditarLancamento({ params }: PageProps<"/lancamentos/[id]/editar">) {
  const { id } = await params;
  if (!ehUuid(id)) notFound(); // o banco estranharia um id que não é uuid

  const lancamento = await buscarLancamento(id);
  if (!lancamento) notFound();

  const [categorias, formas, contas] = await Promise.all([listarCategoriasAtivas(), listarFormasPagamento(), listarContas()]);
  const mes = mesParaTexto(mesDe(lancamento.data));

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link
          href={`/lancamentos?mes=${mes}`}
          className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave"
        >
          <ArrowLeft size={16} aria-hidden /> Voltar
        </Link>
        <h1 className="text-2xl font-bold">Editar lançamento</h1>
      </div>
      {lancamento.status === "estimado" && (
        <p className="rounded-card bg-limao px-4 py-3 text-sm">
          Esse valor é uma <strong>estimativa</strong> pela média dos últimos meses. Quando chegar a conta, ajuste o
          valor e confirme: aí ele entra no saldo.
        </p>
      )}
      {lancamento.status === "a_pagar" && (
        <p className="rounded-card bg-limao px-4 py-3 text-sm">
          Essa conta <strong>ainda não foi paga</strong>, então não saiu do seu saldo. Marque &quot;Já paguei&quot; quando pagar.
        </p>
      )}
      <FormLancamento
        contas={contas}
        categorias={categorias}
        formas={formas}
        hoje={hojeISO()}
        inicial={{
          id: lancamento.id,
          tipo: lancamento.tipo,
          valor: lancamento.valor,
          data: lancamento.dataCompra ?? lancamento.data,
          descricao: lancamento.descricao,
          categoriaId: lancamento.categoriaId,
          formaPagamentoId: lancamento.formaPagamentoId,
          contaId: lancamento.contaId,
          obs: lancamento.obs,
          estimado: lancamento.status === "estimado",
          pago: lancamento.status === "confirmado",
          vencimento: lancamento.vencimento,
          holerite: lancamento.holerite,
        }}
      />
      <BotaoApagar id={lancamento.id} mes={mes} />
    </section>
  );
}
