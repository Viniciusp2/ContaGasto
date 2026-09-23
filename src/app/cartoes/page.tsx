import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormCartao } from "@/components/form-cartao";
import { listarFormasPagamento } from "@/db/consultas";

export const dynamic = "force-dynamic";

export default async function Cartoes() {
  const cartoes = (await listarFormasPagamento()).filter((f) => f.tipo === "credito");

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link href="/mais" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave">
          <ArrowLeft size={16} aria-hidden /> Mais
        </Link>
        <h1 className="text-2xl font-bold">Cartões</h1>
        <p className="text-sm text-tinta-suave">
          Compra até o dia do fechamento entra na fatura do mês; depois, na próxima. O gasto aparece no dia do
          vencimento, quando o dinheiro sai. Sem os dias, conta no dia da compra.
        </p>
      </div>
      {cartoes.map((c) => (
        <FormCartao
          key={c.id}
          id={c.id}
          nome={c.nome}
          diaFechamento={c.diaFechamento}
          diaVencimento={c.diaVencimento}
        />
      ))}
    </section>
  );
}
