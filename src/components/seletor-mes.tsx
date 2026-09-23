import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mesParaTexto, nomeDoMes, somarMeses, type Mes } from "@/lib/datas";

// Trocar de mês é só trocar o ?mes= da URL, então funciona com voltar do navegador e link compartilhado
export function SeletorMes({ mes, href }: { mes: Mes; href: (mes: string) => string }) {
  const estilo = "flex size-11 items-center justify-center rounded-full bg-cartao shadow-suave active:scale-90";
  return (
    <nav aria-label="Trocar de mês" className="flex items-center justify-between gap-2">
      <Link href={href(mesParaTexto(somarMeses(mes, -1)))} aria-label="Mês anterior" className={estilo}>
        <ChevronLeft aria-hidden />
      </Link>
      <h2 className="text-lg font-bold capitalize">{nomeDoMes(mes)}</h2>
      <Link href={href(mesParaTexto(somarMeses(mes, 1)))} aria-label="Próximo mês" className={estilo}>
        <ChevronRight aria-hidden />
      </Link>
    </nav>
  );
}
