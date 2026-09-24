import Link from "next/link";
import { ArrowLeft, DatabaseBackup, FileSpreadsheet, FileText } from "lucide-react";
import { RestaurarBackup } from "@/components/restaurar-backup";
import { hojeISO, mesParaTexto, mesDe } from "@/lib/datas";

export const dynamic = "force-dynamic";

const botao = "flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-lavanda px-4 font-semibold";

export default function Exportar() {
  const hoje = hojeISO();
  const ano = Number(hoje.slice(0, 4));
  const mes = mesParaTexto(mesDe(hoje));

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link href="/mais" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave">
          <ArrowLeft size={16} aria-hidden /> Mais
        </Link>
        <h1 className="text-2xl font-bold">Exportar e backup</h1>
      </div>

      <section className="flex flex-col gap-3 rounded-card bg-cartao p-4 shadow-suave">
        <h2 className="flex items-center gap-2 font-semibold">
          <FileSpreadsheet size={20} aria-hidden /> Planilha do Excel
        </h2>
        <p className="text-sm text-tinta-suave">Todos os lançamentos do ano, com uma aba de resumo por mês.</p>
        <div className="grid grid-cols-2 gap-2">
          <a href={`/exportar/excel?ano=${ano}`} className={botao} download>
            {ano}
          </a>
          <a href={`/exportar/excel?ano=${ano - 1}`} className={botao} download>
            {ano - 1}
          </a>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-card bg-cartao p-4 shadow-suave">
        <h2 className="flex items-center gap-2 font-semibold">
          <FileText size={20} aria-hidden /> Relatório em PDF
        </h2>
        <p className="text-sm text-tinta-suave">
          Resumo do mês pronto pra imprimir ou salvar em PDF (no celular: Compartilhar, depois Imprimir, depois Salvar como PDF).
        </p>
        <Link href={`/relatorio?mes=${mes}`} className={botao}>
          Abrir relatório do mês
        </Link>
      </section>

      <section className="flex flex-col gap-3 rounded-card bg-cartao p-4 shadow-suave">
        <h2 className="flex items-center gap-2 font-semibold">
          <DatabaseBackup size={20} aria-hidden /> Backup
        </h2>
        <p className="text-sm text-tinta-suave">
          Um arquivo com tudo: lançamentos, fixos, metas, objetivos, empréstimos e configurações. Guarde num lugar seguro.
        </p>
        <a href="/exportar/backup" className={botao} download>
          Baixar backup
        </a>
        <RestaurarBackup />
      </section>
    </section>
  );
}
