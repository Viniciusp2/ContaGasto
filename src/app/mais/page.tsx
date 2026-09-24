import Link from "next/link";
import { cookies } from "next/headers";
import { SeletorTema } from "@/components/seletor-tema";
import { BotaoSair } from "@/components/botao-sair";
import { FormSenha } from "@/components/form-senha";
import { obterAcesso } from "@/db/acesso";
import { COOKIE_TEMA, lerTema } from "@/lib/tema";
import { CalendarRange, Download, ChartColumn, ChevronRight, CreditCard, HandCoins, PiggyBank, Repeat } from "lucide-react";

const itens = [
  { href: "/fixos", rotulo: "Fixos e parcelas", texto: "O que repete todo mês", Icone: Repeat, cor: "bg-lavanda" },
  { href: "/cartoes", rotulo: "Cartões", texto: "Fechamento e vencimento da fatura", Icone: CreditCard, cor: "bg-coral" },
  { href: "/objetivos", rotulo: "Objetivos", texto: "Caixinhas pra juntar dinheiro", Icone: PiggyBank, cor: "bg-limao" },
  { href: "/graficos", rotulo: "Gráficos", texto: "Fluxo, vilões, forma de pagamento e dia da semana", Icone: ChartColumn, cor: "bg-menta" },
  { href: "/resumo", rotulo: "Resumo do ano", texto: "Mês, trimestre, semestre e ano", Icone: CalendarRange, cor: "bg-lavanda" },
  { href: "/exportar", rotulo: "Exportar e backup", texto: "Excel, relatório em PDF e backup", Icone: Download, cor: "bg-limao" },
  { href: "/emprestimos", rotulo: "Empréstimos", texto: "Quem te deve e a quem você deve", Icone: HandCoins, cor: "bg-menta" },
];

export const dynamic = "force-dynamic";

export default async function Mais() {
  const tema = lerTema((await cookies()).get(COOKIE_TEMA)?.value);
  const acesso = await obterAcesso(false);
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
      <SeletorTema atual={tema} />
      <FormSenha usandoSenhaInicial={acesso.usandoSenhaInicial} />
      {acesso.ligado && <BotaoSair />}
    </section>
  );
}
