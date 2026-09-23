import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormLancamento } from "@/components/form-lancamento";
import { listarCategoriasAtivas, listarFormasPagamento } from "@/db/consultas";
import { hojeISO } from "@/lib/datas";

export const dynamic = "force-dynamic";

export default async function NovoLancamento() {
  const [categorias, formas] = await Promise.all([listarCategoriasAtivas(), listarFormasPagamento()]);

  return (
    <section>
      <Link href="/lancamentos" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave">
        <ArrowLeft size={16} aria-hidden /> Voltar
      </Link>
      <h1 className="mb-4 text-2xl font-bold">Novo lançamento</h1>
      <FormLancamento categorias={categorias} formas={formas} hoje={hojeISO()} />
    </section>
  );
}
