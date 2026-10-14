import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormLancamento } from "@/components/form-lancamento";
import { listarCategoriasAtivas, listarContas, listarFormasPagamento } from "@/db/consultas";
import { ultimaContaUsada } from "@/db/saldos";
import { hojeISO } from "@/lib/datas";

export const dynamic = "force-dynamic";

export default async function NovoLancamento({ searchParams }: PageProps<"/lancamentos/novo">) {
  // Vindo de Pagamentos: já abre como conta que repete todo mês
  const conta = (await searchParams).conta === "1";
  const [categorias, formas, contas, contaPadrao] = await Promise.all([
    listarCategoriasAtivas(),
    listarFormasPagamento(),
    listarContas(),
    ultimaContaUsada(),
  ]);

  return (
    <section>
      <Link href={conta ? "/pagamentos" : "/lancamentos"} className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave">
        <ArrowLeft size={16} aria-hidden /> Voltar
      </Link>
      <h1 className="mb-4 text-2xl font-bold">{conta ? "Nova conta" : "Novo lançamento"}</h1>
      <FormLancamento categorias={categorias} formas={formas} contas={contas} contaPadrao={contaPadrao} hoje={hojeISO()} modoConta={conta} />
    </section>
  );
}
