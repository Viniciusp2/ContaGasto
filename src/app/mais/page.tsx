import Link from "next/link";
import { ChevronRight, CreditCard, HandCoins, Repeat } from "lucide-react";

const itens = [
  { href: "/fixos", rotulo: "Fixos e parcelas", texto: "O que repete todo mês", Icone: Repeat, cor: "bg-lavanda" },
  { href: "/cartoes", rotulo: "Cartões", texto: "Fechamento e vencimento da fatura", Icone: CreditCard, cor: "bg-coral" },
  { href: "/emprestimos", rotulo: "Empréstimos", texto: "Quem te deve e a quem você deve", Icone: HandCoins, cor: "bg-menta" },
];

export default function Mais() {
  return (
    <section className="flex flex-col gap-3">
      <h1 className="mb-1 text-2xl font-bold">Mais</h1>
      {itens.map(({ href, rotulo, texto, Icone, cor }) => (
        <Link
          key={href}
          href={href}
          className="flex min-h-16 items-center gap-4 rounded-card bg-cartao p-4 shadow-suave active:scale-[0.98]"
        >
          <span className={`rounded-full p-3 ${cor}`}>
            <Icone size={22} aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block font-semibold">{rotulo}</span>
            <span className="block text-sm text-tinta-suave">{texto}</span>
          </span>
          <ChevronRight size={20} className="text-tinta-suave" aria-hidden />
        </Link>
      ))}
      <p className="mt-2 text-center text-sm text-tinta-suave">
        Objetivos, resumo do ano e configurações chegam nas próximas sprints.
      </p>
    </section>
  );
}
